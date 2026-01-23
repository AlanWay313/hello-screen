// Rotas de Configuração de Integração
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { encrypt } from '../lib/encryption';
import { authMiddleware, generateToken } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// SCHEMAS
// ==========================================

const setupIntegrationSchema = z.object({
  // Credenciais OLÉ TV
  oleKeyapi: z.string().min(1, 'keyapi é obrigatório'),
  oleLogin: z.string().min(1, 'login é obrigatório'),
  olePassword: z.string().min(1, 'senha é obrigatória'),
  
  // Dados do usuário (para criar conta se não existir)
  email: z.string().email('Email inválido').optional(),
  nome: z.string().optional(),
});

const createIntegrationSchema = z.object({
  oleKeyapi: z.string().min(1, 'keyapi é obrigatório'),
  oleLogin: z.string().min(1, 'login é obrigatório'),
  olePassword: z.string().min(1, 'senha é obrigatória'),
  webhookSecret: z.string().optional(),
});

const updateIntegrationSchema = createIntegrationSchema.partial();

// ==========================================
// UTILITÁRIOS
// ==========================================

/**
 * Gera um token de webhook seguro (32 bytes hex = 64 caracteres)
 */
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Gera um userId único
 */
function generateUserId(): string {
  return `user_${crypto.randomBytes(16).toString('hex')}`;
}

// ==========================================
// POST /integration/setup - CONFIGURAÇÃO INICIAL
// ==========================================

/**
 * Endpoint simplificado para configurar integração
 * Cria usuário + integração + token do webhook em uma única chamada
 * 
 * @body oleKeyapi - Key API da OLÉ TV
 * @body oleLogin - Login da API OLÉ
 * @body olePassword - Senha da API OLÉ
 * @body email - Email do usuário (opcional)
 * @body nome - Nome do usuário (opcional)
 * 
 * @returns webhookToken - Token para usar no header do webhook
 * @returns webhookUrl - URL completa do endpoint de webhook
 * @returns authToken - JWT para acessar outras rotas da API
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // 1. Validar dados
    const parseResult = setupIntegrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: parseResult.error.errors,
      });
    }

    const { oleKeyapi, oleLogin, olePassword, email, nome } = parseResult.data;

    // 2. Verificar se já existe integração com essas credenciais
    const existingByLogin = await prisma.integration.findFirst({
      where: { oleLogin },
    });

    if (existingByLogin) {
      // Retorna dados da integração existente
      const authToken = generateToken(existingByLogin.userId, email);
      
      return res.status(200).json({
        success: true,
        message: 'Integração já existe',
        data: {
          integrationId: existingByLogin.id,
          userId: existingByLogin.userId,
          webhookToken: existingByLogin.webhookSecret,
          webhookUrl: `${req.protocol}://${req.get('host')}/webhook/sync`,
          authToken,
          isNew: false,
        },
      });
    }

    // 3. Gerar IDs e tokens
    const userId = generateUserId();
    const webhookToken = generateWebhookToken();

    // 4. Criar integração
    const integration = await prisma.integration.create({
      data: {
        userId,
        oleKeyapi,
        oleLogin,
        olePassword: encrypt(olePassword),
        webhookSecret: webhookToken,
        isActive: true,
      },
    });

    // 5. Gerar JWT para acesso às rotas
    const authToken = generateToken(userId, email);

    logger.info('Nova integração configurada via /setup', {
      integrationId: integration.id,
      userId,
      oleLogin,
    });

    // 6. Retornar dados de configuração
    return res.status(201).json({
      success: true,
      message: 'Integração configurada com sucesso!',
      data: {
        integrationId: integration.id,
        userId,
        
        // Tokens
        webhookToken,
        authToken,
        
        // URL do webhook
        webhookUrl: `${req.protocol}://${req.get('host')}/webhook/sync`,
        
        // Instruções
        instructions: {
          webhook: {
            url: `${req.protocol}://${req.get('host')}/webhook/sync`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Username': '<seu_usuario_externo>',
              'Password': '<sua_senha_externa>',
              'Token': webhookToken,
            },
          },
          api: {
            authorization: `Bearer ${authToken}`,
            note: 'Use este token no header Authorization para acessar rotas protegidas',
          },
        },
        
        isNew: true,
      },
    });

  } catch (error: any) {
    logger.error('Erro no setup de integração', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao configurar integração',
      message: error.message,
    });
  }
});

// ==========================================
// POST /integration/regenerate-token - REGENERAR TOKEN
// ==========================================

router.post('/regenerate-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const newToken = generateWebhookToken();

    const integration = await prisma.integration.update({
      where: { userId },
      data: { webhookSecret: newToken },
    });

    logger.info('Token de webhook regenerado', { userId, integrationId: integration.id });

    return res.json({
      success: true,
      message: 'Token regenerado com sucesso',
      data: {
        webhookToken: newToken,
        webhookUrl: `${req.protocol}://${req.get('host')}/webhook/sync`,
        note: 'Atualize o header Token no sistema que envia webhooks',
      },
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }
    logger.error('Erro ao regenerar token', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /integration/status - STATUS DA INTEGRAÇÃO
// ==========================================

router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const integration = await prisma.integration.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            clientsCache: true,
            syncQueue: true,
            syncLogs: true,
          },
        },
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não configurada',
        setupUrl: '/integration/setup',
      });
    }

    // Buscar estatísticas da fila
    const queueStats = await prisma.syncQueue.groupBy({
      by: ['status'],
      where: { integrationId: integration.id },
      _count: true,
    });

    const stats = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
    };

    queueStats.forEach(item => {
      const key = item.status.toLowerCase() as keyof typeof stats;
      if (key in stats) {
        stats[key] = item._count;
      }
    });

    return res.json({
      success: true,
      data: {
        integrationId: integration.id,
        isActive: integration.isActive,
        oleLogin: integration.oleLogin,
        lastSync: integration.lastSync,
        createdAt: integration.createdAt,
        
        // Estatísticas
        stats: {
          clientesNoCache: integration._count.clientsCache,
          itensNaFila: integration._count.syncQueue,
          logsRegistrados: integration._count.syncLogs,
          fila: stats,
        },
        
        // Webhook info
        webhook: {
          url: `${req.protocol}://${req.get('host')}/webhook/sync`,
          tokenConfigured: !!integration.webhookSecret,
        },
      },
    });

  } catch (error: any) {
    logger.error('Erro ao buscar status', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Rotas protegidas por autenticação
// ==========================================

router.use(authMiddleware);

// ==========================================
// GET - Buscar configuração
// ==========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const integration = await prisma.integration.findUnique({
      where: { userId },
      select: {
        id: true,
        oleKeyapi: true,
        oleLogin: true,
        isActive: true,
        lastSync: true,
        webhookSecret: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não configurada',
      });
    }

    return res.json({
      success: true,
      data: integration,
    });

  } catch (error: any) {
    logger.error('Erro ao buscar integração', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST - Criar configuração
// ==========================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const parseResult = createIntegrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: parseResult.error.errors,
      });
    }

    const { oleKeyapi, oleLogin, olePassword, webhookSecret } = parseResult.data;

    const existing = await prisma.integration.findUnique({
      where: { userId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Integração já existe. Use PUT para atualizar.',
      });
    }

    const integration = await prisma.integration.create({
      data: {
        userId,
        oleKeyapi,
        oleLogin,
        olePassword: encrypt(olePassword),
        webhookSecret: webhookSecret || generateWebhookToken(),
      },
      select: {
        id: true,
        oleKeyapi: true,
        oleLogin: true,
        isActive: true,
        webhookSecret: true,
        createdAt: true,
      },
    });

    logger.info('Integração criada', { userId, integrationId: integration.id });

    return res.status(201).json({
      success: true,
      data: integration,
    });

  } catch (error: any) {
    logger.error('Erro ao criar integração', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PUT - Atualizar configuração
// ==========================================

router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const parseResult = updateIntegrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    const updateData: any = { ...data };
    if (data.olePassword) {
      updateData.olePassword = encrypt(data.olePassword);
    }

    const integration = await prisma.integration.update({
      where: { userId },
      data: updateData,
      select: {
        id: true,
        oleKeyapi: true,
        oleLogin: true,
        isActive: true,
        updatedAt: true,
      },
    });

    logger.info('Integração atualizada', { userId, integrationId: integration.id });

    return res.json({
      success: true,
      data: integration,
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }
    logger.error('Erro ao atualizar integração', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DELETE - Desativar integração
// ==========================================

router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await prisma.integration.update({
      where: { userId },
      data: { isActive: false },
    });

    logger.info('Integração desativada', { userId });

    return res.json({
      success: true,
      message: 'Integração desativada',
    });

  } catch (error: any) {
    logger.error('Erro ao desativar integração', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST - Testar conexão com Olé
// ==========================================

router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não configurada',
      });
    }

    const { OleApiService } = await import('../services/ole-api.service');
    const oleApi = await OleApiService.fromIntegration(integration.id);

    const result = await oleApi.listarProdutos();

    return res.json({
      success: result.success,
      message: result.success 
        ? 'Conexão com API Olé OK!' 
        : 'Falha na conexão',
      error: result.error,
    });

  } catch (error: any) {
    logger.error('Erro ao testar integração', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
