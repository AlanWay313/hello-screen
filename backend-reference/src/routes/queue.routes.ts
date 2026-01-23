// Rotas de Monitoramento da Fila de Sincronização
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// ESTATÍSTICAS DA FILA
// ==========================================

/**
 * GET /queue/stats
 * Retorna estatísticas gerais da fila
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Busca integração do usuário
    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    // Conta itens por status
    const [pending, processing, success, failed] = await Promise.all([
      prisma.syncQueue.count({
        where: { integrationId: integration.id, status: 'PENDING' },
      }),
      prisma.syncQueue.count({
        where: { integrationId: integration.id, status: 'PROCESSING' },
      }),
      prisma.syncQueue.count({
        where: { integrationId: integration.id, status: 'SUCCESS' },
      }),
      prisma.syncQueue.count({
        where: { integrationId: integration.id, status: 'FAILED' },
      }),
    ]);

    // Conta por ação (últimas 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentByAction = await prisma.syncQueue.groupBy({
      by: ['action'],
      where: {
        integrationId: integration.id,
        createdAt: { gte: last24h },
      },
      _count: true,
    });

    return res.json({
      success: true,
      data: {
        queue: { pending, processing, success, failed, total: pending + processing + success + failed },
        recentByAction: recentByAction.map(r => ({ action: r.action, count: r._count })),
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Erro ao buscar stats da fila', { error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LISTAR ITENS DA FILA
// ==========================================

/**
 * GET /queue/items
 * Lista itens da fila com paginação e filtros
 */
router.get('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, action, limit = '20', offset = '0' } = req.query;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, error: 'Integração não encontrada' });
    }

    // Monta filtros
    const where: any = { integrationId: integration.id };
    if (status) where.status = status;
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      prisma.syncQueue.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          action: true,
          status: true,
          priority: true,
          attempts: true,
          maxAttempts: true,
          lastError: true,
          scheduledFor: true,
          processedAt: true,
          createdAt: true,
          payload: true,
        },
      }),
      prisma.syncQueue.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: items.map(item => ({
          ...item,
          // Extrai info útil do payload
          documento: (item.payload as any)?.documento,
          nome: (item.payload as any)?.nome,
          localClientId: (item.payload as any)?.localClientId,
        })),
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      },
    });
  } catch (error: any) {
    logger.error('Erro ao listar fila', { error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LISTAR CLIENTES NO CACHE
// ==========================================

/**
 * GET /queue/clients
 * Lista clientes no cache local com status
 */
router.get('/clients', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, limit = '20', offset = '0', search } = req.query;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, error: 'Integração não encontrada' });
    }

    const where: any = { integrationId: integration.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { document: { contains: search as string } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.clientCache.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          externalId: true,
          oleClientId: true,
          oleContractId: true,
          document: true,
          name: true,
          email: true,
          status: true,
          lastSyncAt: true,
          lastSyncError: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.clientCache.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        clients,
        pagination: { total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
      },
    });
  } catch (error: any) {
    logger.error('Erro ao listar clientes cache', { error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RETRY DE ITEM FALHO
// ==========================================

/**
 * POST /queue/retry/:id
 * Reprocessa um item que falhou
 */
router.post('/retry/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, error: 'Integração não encontrada' });
    }

    // Verifica se o item pertence a esta integração
    const item = await prisma.syncQueue.findFirst({
      where: { id, integrationId: integration.id },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }

    // Reseta para pendente
    await prisma.syncQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        scheduledFor: null,
        lastError: null,
      },
    });

    logger.info('Item marcado para retry manual', { queueId: id });

    return res.json({
      success: true,
      message: 'Item reagendado para processamento',
    });
  } catch (error: any) {
    logger.error('Erro ao fazer retry', { error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CANCELAR ITEM PENDENTE
// ==========================================

/**
 * DELETE /queue/:id
 * Cancela um item pendente
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, error: 'Integração não encontrada' });
    }

    const item = await prisma.syncQueue.findFirst({
      where: { id, integrationId: integration.id, status: 'PENDING' },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item não encontrado ou não está pendente' });
    }

    await prisma.syncQueue.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.json({
      success: true,
      message: 'Item cancelado',
    });
  } catch (error: any) {
    logger.error('Erro ao cancelar item', { error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
