// Serviço de Fila de Sincronização
import { SyncAction, SyncStatus, ClientStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { OleApiService } from './ole-api.service';
import { ClientFormatterService } from './client-formatter.service';

// ==========================================
// TIPOS
// ==========================================

interface QueueItemResult {
  success: boolean;
  error?: string;
  data?: any;
  oleClientId?: string;
  oleContractId?: string;
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
    const formatter = new ClientFormatterService();
    const payload = item.payload as Record<string, any>;

    logger.sync(item.action, 'start', { queueId: item.id, action: item.action });

    try {
      let result: any;
      let oleClientId: string | undefined;
      let oleContractId: string | undefined;

      switch (item.action) {
        case 'CREATE_CLIENT': {
          // 1. Validar e formatar dados
          const validation = formatter.formatForOle(payload);
          
          if (!validation.valid || !validation.formattedData) {
            return { 
              success: false, 
              error: `Validação falhou: ${validation.errors.join(', ')}` 
            };
          }

          // 2. Log de warnings (não bloqueiam)
          if (validation.warnings.length > 0) {
            logger.warn('Avisos na formatação', { 
              queueId: item.id,
              warnings: validation.warnings 
            });
          }

          // 3. Inserir cliente na Olé TV
          result = await oleApi.inserirCliente(validation.formattedData);
          
          if (result.success && result.data) {
            // Extrai ID do cliente criado
            oleClientId = result.data.id_cliente?.toString() || result.data.id?.toString();
            
            // 4. Atualizar ClientCache com ID da Olé
            if (payload.localClientId && oleClientId) {
              await this.updateClientCacheAfterSync(
                payload.localClientId, 
                oleClientId,
                'SYNCED'
              );

              // 5. Atualizar itens pendentes de CREATE_CONTRACT com o ID do cliente
              await this.updatePendingContractItems(payload.localClientId, parseInt(oleClientId));
            }
            
            logger.info('Cliente criado na Olé TV', { 
              oleClientId,
              documento: payload.documento 
            });
          }
          break;
        }

        case 'UPDATE_CLIENT': {
          // 1. Validar dados
          if (!payload.idCliente) {
            return { success: false, error: 'ID do cliente não informado' };
          }

          // 2. Formatar apenas campos alterados
          const updateData: Record<string, any> = {};
          
          if (payload.nome) updateData.nome = payload.nome.toUpperCase();
          if (payload.email) updateData.email = [payload.email];
          if (payload.telefone) {
            const phoneLimpo = payload.telefone.replace(/\D/g, '');
            if (phoneLimpo.length >= 10) {
              updateData.telefone_ddd = [phoneLimpo.slice(0, 2)];
              updateData.telefone_numero = [phoneLimpo.slice(2)];
            }
          }

          // 3. Alterar cliente na Olé
          result = await oleApi.alterarCliente(payload.idCliente, updateData);
          
          if (result.success && payload.localClientId) {
            await this.updateClientCacheAfterSync(
              payload.localClientId,
              payload.idCliente,
              'SYNCED'
            );
          }
          break;
        }

        case 'REACTIVATE_CLIENT': {
          // Reativar = desbloquear contrato
          if (!payload.idContrato) {
            return { success: false, error: 'ID do contrato não informado para reativação' };
          }

          // Busca bloqueios ativos
          const bloqueiosResult = await oleApi.listarBloqueios(payload.idContrato, true);
          
          if (bloqueiosResult.success && bloqueiosResult.data?.length > 0) {
            // Desbloqueia o primeiro bloqueio ativo
            const bloqueioId = bloqueiosResult.data[0].id;
            result = await oleApi.desbloquearContrato(payload.idContrato, bloqueioId);
          } else {
            // Não há bloqueios para remover
            result = { success: true, data: { message: 'Nenhum bloqueio ativo encontrado' } };
          }

          if (result.success && payload.localClientId) {
            await this.updateClientCacheAfterSync(
              payload.localClientId,
              payload.idCliente,
              'SYNCED'
            );
          }
          break;
        }

        case 'CREATE_CONTRACT': {
          if (!payload.id_cliente || !payload.id_plano_principal) {
            return { 
              success: false, 
              error: 'ID do cliente e ID do plano são obrigatórios' 
            };
          }

          result = await oleApi.inserirContrato({
            id_cliente: payload.id_cliente,
            id_plano_principal: payload.id_plano_principal,
            id_modelo: payload.id_modelo,
            mac: payload.mac,
            id_plano_adicional: payload.id_plano_adicional,
            email_usuario: payload.email_usuario,
          });

          if (result.success && result.data) {
            oleContractId = result.data.id_contrato?.toString() || result.data.id?.toString();
            
            if (payload.localClientId && oleContractId) {
              await prisma.clientCache.update({
                where: { id: payload.localClientId },
                data: { oleContractId },
              });
            }
            
            logger.info('Contrato criado na Olé TV', { 
              oleContractId,
              oleClientId: payload.id_cliente 
            });
          }
          break;
        }

        case 'CANCEL_CONTRACT': {
          if (!payload.idContrato) {
            return { success: false, error: 'ID do contrato não informado' };
          }

          // Bloquear contrato por inadimplência ou pedido do cliente
          result = await oleApi.bloquearContrato(
            payload.idContrato,
            payload.motivoSuspensao || 2, // 2 = Pedido do Cliente
            payload.dataEncerramento
          );

          if (result.success && payload.localClientId) {
            await this.updateClientCacheAfterSync(
              payload.localClientId,
              payload.idCliente,
              'CANCELLED'
            );
          }
          break;
        }

        default:
          throw new Error(`Ação desconhecida: ${item.action}`);
      }

      if (result?.success) {
        return { 
          success: true, 
          data: result.data,
          oleClientId,
          oleContractId,
        };
      } else {
        return { 
          success: false, 
          error: result?.error || 'Resposta inválida da API Olé TV' 
        };
      }

    } catch (error: any) {
      logger.error('Erro ao processar item da fila', { 
        queueId: item.id,
        action: item.action,
        error: error.message 
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza o ClientCache após sincronização bem-sucedida
   */
  private async updateClientCacheAfterSync(
    localClientId: string,
    oleClientId: string | undefined,
    status: ClientStatus
  ): Promise<void> {
    try {
      await prisma.clientCache.update({
        where: { id: localClientId },
        data: {
          oleClientId: oleClientId || undefined,
          status,
          lastSyncAt: new Date(),
        },
      });
      
      logger.info('ClientCache atualizado após sync', { 
        localClientId, 
        oleClientId, 
        status 
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar ClientCache', { 
        localClientId, 
        error: error.message 
      });
    }
  }

  /**
   * Atualiza itens pendentes de CREATE_CONTRACT com o ID do cliente recém-criado
   * Isso permite que o contrato seja criado logo após o cliente
   */
  private async updatePendingContractItems(
    localClientId: string,
    oleClientId: number
  ): Promise<void> {
    try {
      // Busca itens de CREATE_CONTRACT pendentes para este cliente
      const pendingContracts = await prisma.syncQueue.findMany({
        where: {
          integrationId: this.integrationId,
          action: 'CREATE_CONTRACT',
          status: 'PENDING',
        },
      });

      // Filtra e atualiza apenas os que pertencem a este cliente
      for (const item of pendingContracts) {
        const payload = item.payload as Record<string, any>;
        
        if (payload.localClientId === localClientId) {
          // Atualiza o payload com o ID do cliente
          const updatedPayload = {
            ...payload,
            id_cliente: oleClientId,
          };

          await prisma.syncQueue.update({
            where: { id: item.id },
            data: {
              payload: updatedPayload,
              scheduledFor: null, // Remove delay, pode executar agora
            },
          });

          logger.info('Item de contrato atualizado com ID do cliente', {
            queueId: item.id,
            localClientId,
            oleClientId,
          });
        }
      }
    } catch (error: any) {
      logger.error('Erro ao atualizar itens de contrato pendentes', {
        localClientId,
        oleClientId,
        error: error.message,
      });
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
