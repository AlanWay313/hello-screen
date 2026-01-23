// Rotas de Sincronização
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { SyncQueueService } from '../services/sync-queue.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// ==========================================
// ESTATÍSTICAS
// ==========================================

/**
 * GET /sync/stats
 * Retorna estatísticas da fila de sincronização
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    const syncQueue = new SyncQueueService(integration.id);
    const stats = await syncQueue.getStats();

    return res.json({
      success: true,
      data: stats,
    });

  } catch (error: any) {
    logger.error('Erro ao buscar estatísticas', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LISTA DE ITENS NA FILA
// ==========================================

/**
 * GET /sync/queue
 * Lista itens na fila de sincronização
 */
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    const where: any = { integrationId: integration.id };
    if (status) {
      where.status = status.toUpperCase();
    }

    const items = await prisma.syncQueue.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return res.json({
      success: true,
      data: items,
      count: items.length,
    });

  } catch (error: any) {
    logger.error('Erro ao listar fila', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PROCESSAR FILA MANUALMENTE
// ==========================================

/**
 * POST /sync/process
 * Processa itens pendentes na fila
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.body.limit) || 10;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    const syncQueue = new SyncQueueService(integration.id);
    const result = await syncQueue.processQueue(limit);

    return res.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    logger.error('Erro ao processar fila', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RETRY DE ITEM ESPECÍFICO
// ==========================================

/**
 * POST /sync/retry/:id
 * Reprocessa um item específico
 */
router.post('/retry/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const queueId = req.params.id;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    // Verifica se o item pertence a esta integração
    const item = await prisma.syncQueue.findFirst({
      where: {
        id: queueId,
        integrationId: integration.id,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const syncQueue = new SyncQueueService(integration.id);
    await syncQueue.retryItem(queueId);

    return res.json({
      success: true,
      message: 'Item marcado para reprocessamento',
    });

  } catch (error: any) {
    logger.error('Erro ao fazer retry', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LOGS DE SINCRONIZAÇÃO
// ==========================================

/**
 * GET /sync/logs
 * Lista logs de sincronização
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const success = req.query.success as string | undefined;

    const integration = await prisma.integration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }

    const where: any = { integrationId: integration.id };
    if (success !== undefined) {
      where.success = success === 'true';
    }

    const logs = await prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.json({
      success: true,
      data: logs,
      count: logs.length,
    });

  } catch (error: any) {
    logger.error('Erro ao buscar logs', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
