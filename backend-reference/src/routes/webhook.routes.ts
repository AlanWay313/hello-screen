// Rotas de Webhook - Sistema Externo → Backend
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { OrchestratorService } from '../services/orchestrator.service';
import { webhookAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// SCHEMAS DE VALIDAÇÃO (FORMATO REAL DO WEBHOOK)
// ==========================================

const serviceTagSchema = z.object({
  Id: z.number(),
  Tag: z.string(),
});

const serviceSchema = z.object({
  Active: z.boolean(),
  ContractItem: z.number(),
  Fingerprint: z.string(),
  Description: z.string(),
  IntegrationCode: z.string(),
  IntegratorType: z.number(),
  Demonstration: z.boolean(),
  DemonstrationFinalDate: z.string().optional(),
  ServiceTag: serviceTagSchema.optional(),
});

const contractSchema = z.object({
  Id: z.number(),
  Number: z.string(),
  Description: z.string(),
  BeginContractVigency: z.string(),
  EndContractVigency: z.string(),
  Fingerprint: z.string(),
});

const clientSchema = z.object({
  Name: z.string(),
  TxId: z.string(), // CPF/CNPJ formatado (ex: 830.203.147-04)
  Email: z.string().email().optional().nullable(),
  Phone: z.string().optional().nullable(),
  CellPhone: z.string().optional().nullable(),
});

const companyPlaceSchema = z.object({
  Id: z.number(),
  Code: z.string(),
  Name: z.string(),
});

const statusSchema = z.object({
  Code: z.number(),
  Description: z.string(),
});

const stageSchema = z.object({
  Code: z.number(),
  Description: z.string(),
});

// Schema principal do webhook
const webhookPayloadSchema = z.object({
  Active: z.boolean(),
  Version: z.number(),
  Timestamp: z.string(),
  Contract: contractSchema,
  Client: clientSchema,
  CompanyPlace: companyPlaceSchema,
  Status: statusSchema,
  Stage: stageSchema,
  Services: z.array(serviceSchema).optional().default([]),
  Patrimonies: z.array(z.any()).optional().default([]),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// ==========================================
// MAPEAMENTO DE STATUS/STAGE → AÇÃO
// ==========================================

/**
 * Determina a ação baseada no Status e Stage do contrato
 * 
 * Status codes conhecidos:
 *  1 = Normal
 *  2 = Suspenso
 *  3 = Cancelado
 * 
 * Stage codes conhecidos:
 *  1 = Pendente
 *  2 = Em análise
 *  3 = Aprovado
 *  4 = Rejeitado
 */
function determineAction(payload: WebhookPayload): 'create' | 'update' | 'cancel' | 'skip' {
  const statusCode = payload.Status.Code;
  const stageCode = payload.Stage.Code;
  const isActive = payload.Active;

  // Cancelado
  if (statusCode === 3 || !isActive) {
    return 'cancel';
  }

  // Aprovado e ativo = criar ou atualizar
  if (stageCode === 3 && statusCode === 1) {
    return 'create'; // O orquestrador decide se é create ou update
  }

  // Suspenso ou outros status
  if (statusCode === 2) {
    return 'update'; // Atualiza status para suspenso
  }

  // Pendente ou em análise - não sincroniza ainda
  if (stageCode === 1 || stageCode === 2) {
    return 'skip';
  }

  // Default: atualização
  return 'update';
}

/**
 * Limpa documento (remove formatação)
 */
function cleanDocument(txId: string): string {
  return txId.replace(/[.\-\/]/g, '');
}

// ==========================================
// ENDPOINT DO WEBHOOK
// ==========================================

/**
 * POST /webhook/sync
 * Recebe eventos do sistema externo (ERP/Syspro)
 * 
 * Headers obrigatórios:
 * - Username: login do sistema
 * - Password: senha do sistema
 * - Token: token de autenticação
 */
router.post('/sync', webhookAuthMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const integrationId = (req as any).integrationId;
  
  try {
    // 1. Log do payload recebido (para debug)
    logger.info('Webhook recebido', {
      integrationId,
      timestamp: req.body.Timestamp,
      contractNumber: req.body.Contract?.Number,
    });

    // 2. Validar payload
    const parseResult = webhookPayloadSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      logger.warn('Payload de webhook inválido', { 
        errors: parseResult.error.errors,
        receivedKeys: Object.keys(req.body),
      });
      
      // Salva payload inválido para debug
      await prisma.syncLog.create({
        data: {
          integrationId,
          endpoint: '/webhook/sync',
          method: 'POST',
          requestBody: req.body,
          responseBody: { errors: parseResult.error.errors },
          statusCode: 400,
          success: false,
          errorMessage: 'Payload inválido',
        },
      });
      
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parseResult.error.errors,
      });
    }

    const payload = parseResult.data;

    // 3. Determinar ação baseada no status
    const action = determineAction(payload);

    if (action === 'skip') {
      logger.info('Webhook ignorado (stage pendente)', {
        contractNumber: payload.Contract.Number,
        stage: payload.Stage.Description,
      });

      return res.status(200).json({
        success: true,
        action: 'skipped',
        message: `Contrato em stage "${payload.Stage.Description}" - aguardando aprovação`,
      });
    }

    // 4. Transformar para formato do orquestrador
    const orchestratorPayload = {
      action,
      externalId: payload.Contract.Fingerprint, // ID único do contrato
      documento: cleanDocument(payload.Client.TxId),
      nome: payload.Client.Name,
      email: payload.Client.Email || undefined,
      telefone: payload.Client.CellPhone || payload.Client.Phone || undefined,
      
      // Dados do contrato
      contratoId: payload.Contract.Id,
      contratoNumero: payload.Contract.Number,
      contratoDescricao: payload.Contract.Description,
      contratoInicio: payload.Contract.BeginContractVigency,
      contratoFim: payload.Contract.EndContractVigency,
      
      // Empresa/Filial
      empresaId: payload.CompanyPlace.Id,
      empresaCodigo: payload.CompanyPlace.Code,
      empresaNome: payload.CompanyPlace.Name,
      
      // Status atual
      statusCode: payload.Status.Code,
      statusDescricao: payload.Status.Description,
      stageCode: payload.Stage.Code,
      stageDescricao: payload.Stage.Description,
      
      // Serviços/Produtos
      products: payload.Services.map(service => ({
        externalId: service.Fingerprint,
        code: service.IntegrationCode,
        name: service.Description,
        quantity: 1,
        active: service.Active,
        tag: service.ServiceTag?.Tag,
        tagId: service.ServiceTag?.Id,
        integratorType: service.IntegratorType,
        demonstration: service.Demonstration,
      })),
      
      // Payload original completo (para auditoria)
      rawPayload: payload,
    };

    // 5. Processar via orquestrador
    const orchestrator = new OrchestratorService(integrationId);
    const result = await orchestrator.processWebhook(orchestratorPayload);

    // 6. Atualizar último sync
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSync: new Date() },
    });

    const duration = Date.now() - startTime;

    // 7. Log de sucesso
    await prisma.syncLog.create({
      data: {
        integrationId,
        endpoint: '/webhook/sync',
        method: 'POST',
        requestBody: payload,
        responseBody: result,
        statusCode: 200,
        success: result.success,
        duration,
      },
    });
    
    logger.info('Webhook processado', {
      action: orchestratorPayload.action,
      contractNumber: payload.Contract.Number,
      clientDocument: orchestratorPayload.documento,
      result: result.action,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: result.success,
      action: result.action,
      message: result.message,
      data: result.data,
      processingTime: `${duration}ms`,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error('Erro ao processar webhook', { 
      error: error.message,
      stack: error.stack,
    });

    // Log de erro
    await prisma.syncLog.create({
      data: {
        integrationId,
        endpoint: '/webhook/sync',
        method: 'POST',
        requestBody: req.body,
        statusCode: 500,
        success: false,
        errorMessage: error.message,
        duration,
      },
    });
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar webhook',
      message: error.message,
    });
  }
});

// ==========================================
// ENDPOINT DE HEALTH CHECK
// ==========================================

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0',
  });
});

// ==========================================
// ENDPOINT DE TESTE (DEV ONLY)
// ==========================================

if (process.env.NODE_ENV !== 'production') {
  router.post('/test', async (req: Request, res: Response) => {
    logger.info('Webhook de teste recebido', { body: req.body });
    
    return res.json({
      success: true,
      message: 'Payload recebido',
      headers: {
        username: req.headers['username'],
        password: req.headers['password'] ? '***' : undefined,
        token: req.headers['token'] ? '***' : undefined,
      },
      body: req.body,
    });
  });
}

export default router;
