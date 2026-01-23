// Rotas de Webhook
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { OrchestratorService } from '../services/orchestrator.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const webhookPayloadSchema = z.object({
  action: z.enum(['create', 'update', 'cancel']),
  externalId: z.string().min(1),
  documento: z.string().min(11).max(18), // CPF ou CNPJ
  nome: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  cep: z.string().max(9).optional(),
  motivo: z.string().optional(), // Para cancelamentos
  products: z.array(z.object({
    externalId: z.string(),
    code: z.string(),
    name: z.string(),
    quantity: z.number().optional(),
  })).optional(),
});

// ==========================================
// ENDPOINT DO WEBHOOK
// ==========================================

/**
 * POST /webhook/ole
 * Recebe eventos do sistema externo
 */
router.post('/ole', authMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // 1. Validar payload
    const parseResult = webhookPayloadSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      logger.warn('Payload de webhook inválido', { 
        errors: parseResult.error.errors 
      });
      
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parseResult.error.errors,
      });
    }

    const payload = parseResult.data;

    // 2. Buscar integração do usuário autenticado
    const userId = (req as any).userId;
    
    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não configurada para este usuário',
      });
    }

    if (!integration.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Integração desativada',
      });
    }

    // 3. Processar via orquestrador
    const orchestrator = new OrchestratorService(integration.id);
    const result = await orchestrator.processWebhook(payload);

    // 4. Atualizar último sync
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSync: new Date() },
    });

    const duration = Date.now() - startTime;
    
    logger.info('Webhook processado', {
      action: payload.action,
      externalId: payload.externalId,
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
    logger.error('Erro ao processar webhook', { error: error.message });
    
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
    timestamp: new Date().toISOString() 
  });
});

export default router;
