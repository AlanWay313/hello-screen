// Rotas de Sincronização: Olé TV → Banco Local
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { SyncFromOleService } from '../services/sync-from-ole.service';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

const router = Router();

// ==========================================
// SINCRONIZAÇÃO MANUAL COMPLETA
// ==========================================

/**
 * POST /sync-from-ole/full
 * Executa sincronização completa: Clientes, Contratos e Boletos
 */
router.post('/full', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Buscar integração do usuário
    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada. Configure suas credenciais primeiro.',
      });
    }

    logger.info(`🚀 Usuário ${userId} iniciou sincronização completa`);

    // Executar sincronização
    const syncService = await SyncFromOleService.fromIntegration(integration.id);
    const result = await syncService.syncAll();

    res.json({
      success: result.success,
      message: result.success 
        ? 'Sincronização completa realizada com sucesso'
        : 'Sincronização concluída com alguns erros',
      data: result,
    });

  } catch (error) {
    logger.error('Erro na sincronização completa', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

// ==========================================
// SINCRONIZAÇÃO INDIVIDUAL POR ENTIDADE
// ==========================================

/**
 * POST /sync-from-ole/clientes
 * Sincroniza apenas clientes
 */
router.post('/clientes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const syncService = await SyncFromOleService.fromIntegration(integration.id);
    const result = await syncService.syncClientes();

    res.json({
      success: result.success,
      data: result,
    });

  } catch (error) {
    logger.error('Erro na sincronização de clientes', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

/**
 * POST /sync-from-ole/contratos
 * Sincroniza apenas contratos (requer clientes já sincronizados)
 */
router.post('/contratos', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const syncService = await SyncFromOleService.fromIntegration(integration.id);
    const result = await syncService.syncContratos();

    res.json({
      success: result.success,
      data: result,
    });

  } catch (error) {
    logger.error('Erro na sincronização de contratos', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

/**
 * POST /sync-from-ole/boletos
 * Sincroniza apenas boletos (requer clientes já sincronizados)
 */
router.post('/boletos', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const syncService = await SyncFromOleService.fromIntegration(integration.id);
    const result = await syncService.syncBoletos();

    res.json({
      success: result.success,
      data: result,
    });

  } catch (error) {
    logger.error('Erro na sincronização de boletos', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

// ==========================================
// ESTATÍSTICAS E CONSULTAS LOCAIS
// ==========================================

/**
 * GET /sync-from-ole/stats
 * Retorna estatísticas do banco local
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const syncService = await SyncFromOleService.fromIntegration(integration.id);
    const stats = await syncService.getLocalStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Erro ao buscar estatísticas', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

/**
 * GET /sync-from-ole/clientes
 * Lista clientes do banco local com paginação
 */
router.get('/clientes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const where: any = { integrationId: integration.id };
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { documento: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [clientes, total] = await Promise.all([
      prisma.oleCliente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' },
        include: {
          contratos: { select: { id: true, plano: true, status: true } },
          _count: { select: { boletos: true } },
        },
      }),
      prisma.oleCliente.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        clientes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('Erro ao listar clientes locais', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

/**
 * GET /sync-from-ole/clientes/:id
 * Busca cliente específico com todos os relacionamentos
 */
router.get('/clientes/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const integration = await prisma.integration.findFirst({
      where: { userId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integração não encontrada',
      });
    }

    const cliente = await prisma.oleCliente.findFirst({
      where: { 
        id,
        integrationId: integration.id,
      },
      include: {
        contratos: true,
        boletos: {
          orderBy: { dataVencimento: 'desc' },
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado',
      });
    }

    res.json({
      success: true,
      data: cliente,
    });

  } catch (error) {
    logger.error('Erro ao buscar cliente', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    });
  }
});

export default router;
