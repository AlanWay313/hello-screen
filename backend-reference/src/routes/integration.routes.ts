// Rotas de Configuração de Integração
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { encrypt } from '../lib/encryption';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// ==========================================
// SCHEMAS
// ==========================================

const createIntegrationSchema = z.object({
  oleKeyapi: z.string().min(1, 'keyapi é obrigatório'),
  oleLogin: z.string().min(1, 'login é obrigatório'),
  olePassword: z.string().min(1, 'senha é obrigatória'),
  webhookSecret: z.string().optional(),
});

const updateIntegrationSchema = createIntegrationSchema.partial();

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
        // Não retorna a senha
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

    // Validar dados
    const parseResult = createIntegrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: parseResult.error.errors,
      });
    }

    const { oleKeyapi, oleLogin, olePassword, webhookSecret } = parseResult.data;

    // Verificar se já existe
    const existing = await prisma.integration.findUnique({
      where: { userId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Integração já existe. Use PUT para atualizar.',
      });
    }

    // Criar integração com senha criptografada
    const integration = await prisma.integration.create({
      data: {
        userId,
        oleKeyapi,
        oleLogin,
        olePassword: encrypt(olePassword),
        webhookSecret,
      },
      select: {
        id: true,
        oleKeyapi: true,
        oleLogin: true,
        isActive: true,
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

    // Se tiver senha, criptografa
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

    // Importa serviço dinamicamente para evitar dependência circular
    const { OleApiService } = await import('../services/ole-api.service');
    const oleApi = await OleApiService.fromIntegration(integration.id);

    // Tenta listar produtos como teste
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
