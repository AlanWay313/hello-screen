// Serviço de Fila de Sincronização
import { SyncAction, SyncStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { OleApiService } from './ole-api.service';

// ==========================================
// TIPOS
// ==========================================

interface QueueItemResult {
  success: boolean;
  error?: string;
  data?: any;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class SyncQueueService {
  private integrationId: string;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
  }

  // ==========================================
  // ADICIONAR À FILA
  // ==========================================

  /**
   * Adiciona item à fila de sincronização
   */
  async addToQueue(
    action: SyncAction,
    payload: Record<string, any>,
    options?: {
      priority?: number;
      scheduledFor?: Date;
      maxAttempts?: number;
    }
  ): Promise<string> {
    const item = await prisma.syncQueue.create({
      data: {
        integrationId: this.integrationId,
        action,
        payload,
        priority: options?.priority || 0,
        scheduledFor: options?.scheduledFor,
        maxAttempts: options?.maxAttempts || 3,
        status: 'PENDING',
      },
    });

    logger.info('Item adicionado à fila', { 
      queueId: item.id, 
      action,
      priority: item.priority 
    });

    return item.id;
  }

  // ==========================================
  // PROCESSAR FILA
  // ==========================================

  /**
   * Busca próximo item para processar
   */
  async getNextItem() {
    return prisma.syncQueue.findFirst({
      where: {
        integrationId: this.integrationId,
        status: 'PENDING',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Marca item como em processamento
   */
  async markAsProcessing(queueId: string) {
    await prisma.syncQueue.update({
      where: { id: queueId },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Marca item como sucesso
   */
  async markAsSuccess(queueId: string) {
    await prisma.syncQueue.update({
      where: { id: queueId },
      data: {
        status: 'SUCCESS',
        processedAt: new Date(),
        errorLog: null,
        lastError: null,
      },
    });
  }

  /**
   * Marca item como falha
   */
  async markAsFailed(queueId: string, error: string) {
    const item = await prisma.syncQueue.findUnique({
      where: { id: queueId },
    });

    if (!item) return;

    const newStatus = item.attempts >= item.maxAttempts ? 'FAILED' : 'PENDING';
    const errorLog = item.errorLog 
      ? `${item.errorLog}\n[${new Date().toISOString()}] ${error}`
      : `[${new Date().toISOString()}] ${error}`;

    await prisma.syncQueue.update({
      where: { id: queueId },
      data: {
        status: newStatus,
        lastError: error,
        errorLog,
        // Reagenda para daqui a 5 minutos se ainda tiver tentativas
        scheduledFor: newStatus === 'PENDING' 
          ? new Date(Date.now() + 5 * 60 * 1000) 
          : undefined,
      },
    });

    logger.warn(`Item da fila falhou (tentativa ${item.attempts}/${item.maxAttempts})`, {
      queueId,
      action: item.action,
      error,
    });
  }

  /**
   * Processa um item da fila
   */
  async processItem(item: any): Promise<QueueItemResult> {
    const oleApi = await OleApiService.fromIntegration(this.integrationId);
    const payload = item.payload as Record<string, any>;

    logger.sync(item.action, 'start', { queueId: item.id });

    try {
      let result: any;

      switch (item.action) {
        case 'CREATE_CLIENT':
          result = await oleApi.cadastrarCliente(payload);
          break;

        case 'UPDATE_CLIENT':
          result = await oleApi.editarCliente(payload.idCliente, payload);
          break;

        case 'REACTIVATE_CLIENT':
          result = await oleApi.reativarContrato(payload.idContrato);
          break;

        case 'CREATE_CONTRACT':
          result = await oleApi.cadastrarContrato(payload.idCliente, payload);
          break;

        case 'UPDATE_CONTRACT':
          // Implementar lógica específica
          break;

        case 'CANCEL_CONTRACT':
          result = await oleApi.cancelarContrato(payload.idContrato, payload.motivo);
          break;

        case 'CREATE_PRODUCT':
          result = await oleApi.adicionarProduto(
            payload.idContrato,
            payload.idProduto,
            payload.quantidade
          );
          break;

        case 'DELETE_PRODUCT':
          result = await oleApi.removerProduto(payload.idContrato, payload.idProduto);
          break;

        default:
          throw new Error(`Ação desconhecida: ${item.action}`);
      }

      if (result?.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result?.error || 'Resposta inválida da API' };
      }

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa toda a fila pendente
   */
  async processQueue(limit: number = 10): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < limit; i++) {
      const item = await this.getNextItem();
      
      if (!item) break;

      await this.markAsProcessing(item.id);
      
      const result = await this.processItem(item);

      if (result.success) {
        await this.markAsSuccess(item.id);
        processed++;
      } else {
        await this.markAsFailed(item.id, result.error || 'Erro desconhecido');
        failed++;
      }
    }

    logger.info('Fila processada', { processed, failed });
    return { processed, failed };
  }

  // ==========================================
  // ESTATÍSTICAS
  // ==========================================

  async getStats() {
    const [pending, processing, success, failed] = await Promise.all([
      prisma.syncQueue.count({ 
        where: { integrationId: this.integrationId, status: 'PENDING' } 
      }),
      prisma.syncQueue.count({ 
        where: { integrationId: this.integrationId, status: 'PROCESSING' } 
      }),
      prisma.syncQueue.count({ 
        where: { integrationId: this.integrationId, status: 'SUCCESS' } 
      }),
      prisma.syncQueue.count({ 
        where: { integrationId: this.integrationId, status: 'FAILED' } 
      }),
    ]);

    return { pending, processing, success, failed };
  }

  /**
   * Lista itens com erro
   */
  async getFailedItems(limit: number = 20) {
    return prisma.syncQueue.findMany({
      where: { 
        integrationId: this.integrationId, 
        status: 'FAILED' 
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retry manual de item específico
   */
  async retryItem(queueId: string) {
    await prisma.syncQueue.update({
      where: { id: queueId },
      data: {
        status: 'PENDING',
        attempts: 0,
        scheduledFor: null,
      },
    });

    logger.info('Item marcado para retry', { queueId });
  }
}

export default SyncQueueService;
