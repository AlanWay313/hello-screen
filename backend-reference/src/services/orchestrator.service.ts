// Serviço de Orquestração
// Centraliza a lógica de decisão para criar/atualizar/reativar clientes

import { ClientStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { OleApiService } from './ole-api.service';
import { ExternalApiService } from './external-api.service';
import { SyncQueueService } from './sync-queue.service';

// ==========================================
// TIPOS
// ==========================================

interface WebhookPayload {
  action: 'create' | 'update' | 'cancel';
  externalId: string;
  documento: string;
  nome?: string;
  email?: string;
  telefone?: string;
  products?: Array<{
    externalId: string;
    code: string;
    name: string;
    quantity?: number;
  }>;
  [key: string]: any;
}

interface OrchestrationResult {
  success: boolean;
  action: 'created' | 'updated' | 'reactivated' | 'cancelled' | 'skipped' | 'queued';
  message: string;
  data?: any;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class OrchestratorService {
  private integrationId: string;
  private oleApi: OleApiService | null = null;
  private externalApi: ExternalApiService;
  private syncQueue: SyncQueueService;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
    this.externalApi = new ExternalApiService(integrationId);
    this.syncQueue = new SyncQueueService(integrationId);
  }

  private async getOleApi(): Promise<OleApiService> {
    if (!this.oleApi) {
      this.oleApi = await OleApiService.fromIntegration(this.integrationId);
    }
    return this.oleApi;
  }

  // ==========================================
  // ORQUESTRAÇÃO PRINCIPAL
  // ==========================================

  /**
   * Processa webhook recebido
   */
  async processWebhook(payload: WebhookPayload): Promise<OrchestrationResult> {
    logger.info('Processando webhook', { 
      action: payload.action, 
      externalId: payload.externalId,
      documento: payload.documento,
    });

    try {
      switch (payload.action) {
        case 'create':
          return await this.handleCreate(payload);
        
        case 'update':
          return await this.handleUpdate(payload);
        
        case 'cancel':
          return await this.handleCancel(payload);
        
        default:
          return {
            success: false,
            action: 'skipped',
            message: `Ação desconhecida: ${payload.action}`,
          };
      }
    } catch (error: any) {
      logger.error('Erro no orquestrador', { 
        error: error.message, 
        payload 
      });
      
      return {
        success: false,
        action: 'skipped',
        message: `Erro: ${error.message}`,
      };
    }
  }

  // ==========================================
  // HANDLERS POR AÇÃO
  // ==========================================

  /**
   * Handler para criação de cliente
   * FLUXO: Webhook → Salva Local (PENDING) → Enriquece → Valida na OLÉ → Decide
   */
  private async handleCreate(payload: WebhookPayload): Promise<OrchestrationResult> {
    // =============================================
    // PASSO 1: PERSISTIR LOCALMENTE PRIMEIRO (PENDING_VALIDATION)
    // =============================================
    logger.info('Salvando dados localmente para validação...', { 
      documento: payload.documento,
      externalId: payload.externalId 
    });

    // Verifica se já existe no cache local
    let localClient = await prisma.clientCache.findFirst({
      where: {
        integrationId: this.integrationId,
        OR: [
          { externalId: payload.externalId },
          { document: payload.documento },
        ],
      },
    });

    // Cria registro local se não existir
    if (!localClient) {
      localClient = await prisma.clientCache.create({
        data: {
          integrationId: this.integrationId,
          externalId: payload.externalId,
          document: payload.documento,
          name: payload.nome || '',
          email: payload.email || '',
          phone: payload.telefone || '',
          rawWebhookData: payload as any, // Dados originais do webhook
          status: 'PENDING_VALIDATION',   // Aguardando validação
          complementaryData: null,
        },
      });
      logger.info('Cliente salvo localmente', { localId: localClient.id });
    } else {
      // Atualiza com novos dados do webhook
      localClient = await prisma.clientCache.update({
        where: { id: localClient.id },
        data: {
          rawWebhookData: payload as any,
          status: 'PENDING_VALIDATION',
        },
      });
      logger.info('Cliente local atualizado', { localId: localClient.id });
    }

    // =============================================
    // PASSO 2: BUSCAR DADOS COMPLEMENTARES (ENRICHMENT)
    // =============================================
    logger.info('Buscando dados complementares na API externa...', { 
      documento: payload.documento 
    });
    
    let complementaryData: any = null;
    try {
      complementaryData = await this.externalApi.buscarCliente(payload.documento);
      
      // Atualiza cache com dados complementares
      await prisma.clientCache.update({
        where: { id: localClient.id },
        data: {
          complementaryData: complementaryData || {},
          status: 'ENRICHED',
        },
      });
      logger.info('Dados complementares salvos', { 
        localId: localClient.id,
        hasData: !!complementaryData 
      });
    } catch (error: any) {
      logger.warn('Falha ao buscar dados complementares', { 
        error: error.message,
        documento: payload.documento 
      });
      // Continua mesmo sem dados complementares
    }

    // =============================================
    // PASSO 3: MESCLAR DADOS (WEBHOOK + COMPLEMENTARES)
    // =============================================
    const clienteData = this.mergeClientData(payload, complementaryData);

    // Atualiza cache com dados mesclados
    await prisma.clientCache.update({
      where: { id: localClient.id },
      data: {
        name: clienteData.nome,
        email: clienteData.email,
        phone: clienteData.telefone,
        address: clienteData.endereco ? {
          logradouro: clienteData.endereco,
          numero: clienteData.numero,
          bairro: clienteData.bairro,
          cidade: clienteData.cidade,
          estado: clienteData.estado,
          cep: clienteData.cep,
        } : null,
        status: 'VALIDATED',
      },
    });

    // =============================================
    // PASSO 4: VERIFICAR ESTADO NA OLÉ (REMOTE CHECK)
    // =============================================
    const oleApi = await this.getOleApi();
    logger.info('Verificando cliente na API OLÉ...', { documento: payload.documento });
    
    const oleClientResult = await oleApi.buscarCliente(payload.documento);

    // =============================================
    // PASSO 5: DECISÃO E CRIAÇÃO DA AÇÃO DE SYNC
    // =============================================
    if (oleClientResult.success && oleClientResult.data) {
      const oleClient = oleClientResult.data;

      // Salva referência da OLÉ no cache local
      await prisma.clientCache.update({
        where: { id: localClient.id },
        data: {
          oleClientId: oleClient.id,
          oleContractId: oleClient.contractId || null,
        },
      });

      // Cliente existe na OLÉ - verificar status
      if (oleClient.status === 'cancelled' || oleClient.status === 'inactive') {
        return await this.reactivateClient(oleClient.id, clienteData, payload, localClient.id);
      } else {
        return await this.updateClient(oleClient.id, clienteData, payload, localClient.id);
      }
    }

    // Cliente não existe na OLÉ - criar
    return await this.createClient(clienteData, payload, localClient.id);
  }

  /**
   * Handler para atualização de cliente
   */
  private async handleUpdate(payload: WebhookPayload): Promise<OrchestrationResult> {
    // Busca cliente no cache local
    const cachedClient = await prisma.clientCache.findFirst({
      where: {
        integrationId: this.integrationId,
        externalId: payload.externalId,
      },
    });

    if (!cachedClient || !cachedClient.oleClientId) {
      // Se não existe no cache, trata como criação
      return await this.handleCreate(payload);
    }

    // Busca dados complementares
    const complementaryData = await this.externalApi.buscarCliente(payload.documento);
    const clienteData = this.mergeClientData(payload, complementaryData);

    // Verifica se houve mudança nos dados
    const hasChanges = this.detectChanges(cachedClient, clienteData);

    if (!hasChanges) {
      return {
        success: true,
        action: 'skipped',
        message: 'Nenhuma alteração detectada',
      };
    }

    return await this.updateClient(cachedClient.oleClientId, clienteData, payload);
  }

  /**
   * Handler para cancelamento
   */
  private async handleCancel(payload: WebhookPayload): Promise<OrchestrationResult> {
    const cachedClient = await prisma.clientCache.findFirst({
      where: {
        integrationId: this.integrationId,
        externalId: payload.externalId,
      },
    });

    if (!cachedClient || !cachedClient.oleContractId) {
      return {
        success: false,
        action: 'skipped',
        message: 'Cliente não encontrado no cache',
      };
    }

    // Adiciona à fila para cancelamento
    const queueId = await this.syncQueue.addToQueue('CANCEL_CONTRACT', {
      idContrato: cachedClient.oleContractId,
      motivo: payload.motivo || 'Cancelamento via webhook',
    });

    // Atualiza cache
    await prisma.clientCache.update({
      where: { id: cachedClient.id },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      action: 'queued',
      message: 'Cancelamento adicionado à fila',
      data: { queueId },
    };
  }

  // ==========================================
  // OPERAÇÕES DE CLIENTE
  // ==========================================

  /**
   * Cria novo cliente na OLÉ
   * (Dados já foram persistidos localmente antes de chegar aqui)
   */
  private async createClient(
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload,
    localClientId: string
  ): Promise<OrchestrationResult> {
    // Adiciona à fila de sincronização
    const queueId = await this.syncQueue.addToQueue('CREATE_CLIENT', {
      ...clienteData,
      localClientId, // Referência ao registro local
    }, {
      priority: 1,
    });

    // Atualiza status no cache local
    await prisma.clientCache.update({
      where: { id: localClientId },
      data: { status: 'PENDING_SYNC' },
    });

    logger.info('Cliente adicionado à fila de criação', { 
      localClientId, 
      queueId 
    });

    return {
      success: true,
      action: 'queued',
      message: 'Cliente validado localmente e adicionado à fila de criação',
      data: { queueId, localClientId },
    };
  }

  /**
   * Atualiza cliente existente na OLÉ
   */
  private async updateClient(
    oleClientId: string,
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload,
    localClientId: string
  ): Promise<OrchestrationResult> {
    const queueId = await this.syncQueue.addToQueue('UPDATE_CLIENT', {
      idCliente: oleClientId,
      localClientId,
      ...clienteData,
    });

    // Atualiza status no cache local
    await prisma.clientCache.update({
      where: { id: localClientId },
      data: { status: 'PENDING_SYNC' },
    });

    logger.info('Cliente adicionado à fila de atualização', { 
      localClientId, 
      oleClientId,
      queueId 
    });

    return {
      success: true,
      action: 'queued',
      message: 'Cliente validado e adicionado à fila de atualização',
      data: { queueId, localClientId },
    };
  }

  /**
   * Reativa cliente cancelado na OLÉ
   */
  private async reactivateClient(
    oleClientId: string,
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload,
    localClientId: string
  ): Promise<OrchestrationResult> {
    // Primeiro reativa, depois atualiza dados
    await this.syncQueue.addToQueue('REACTIVATE_CLIENT', {
      idCliente: oleClientId,
      localClientId,
    }, { priority: 2 });

    const queueId = await this.syncQueue.addToQueue('UPDATE_CLIENT', {
      idCliente: oleClientId,
      localClientId,
      ...clienteData,
    }, { priority: 1 });

    // Atualiza status no cache local
    await prisma.clientCache.update({
      where: { id: localClientId },
      data: { status: 'PENDING_REACTIVATION' },
    });

    logger.info('Cliente adicionado à fila de reativação', { 
      localClientId, 
      oleClientId,
      queueId 
    });

    return {
      success: true,
      action: 'queued',
      message: 'Cliente validado e adicionado à fila de reativação',
      data: { queueId, localClientId },
    };
  }

  // ==========================================
  // UTILITÁRIOS
  // ==========================================

  /**
   * Mescla dados do webhook com dados complementares
   */
  private mergeClientData(
    webhook: WebhookPayload,
    complementary: any | null
  ): Record<string, any> {
    const merged: Record<string, any> = {
      documento: webhook.documento,
      nome: webhook.nome || complementary?.nome || '',
      email: webhook.email || complementary?.email || '',
      telefone: webhook.telefone || complementary?.telefone || complementary?.celular || '',
    };

    // Endereço - prioriza dados complementares (mais completos)
    if (complementary?.endereco) {
      merged.endereco = complementary.endereco.logradouro;
      merged.numero = complementary.endereco.numero;
      merged.complemento = complementary.endereco.complemento;
      merged.bairro = complementary.endereco.bairro;
      merged.cidade = complementary.endereco.cidade;
      merged.estado = complementary.endereco.estado;
      merged.cep = complementary.endereco.cep;
    } else if (webhook.endereco) {
      merged.endereco = webhook.endereco;
      merged.numero = webhook.numero;
      merged.bairro = webhook.bairro;
      merged.cidade = webhook.cidade;
      merged.estado = webhook.estado;
      merged.cep = webhook.cep;
    }

    // Dados adicionais
    if (complementary?.dataNascimento) {
      merged.dataNascimento = complementary.dataNascimento;
    }
    if (complementary?.rg) {
      merged.rg = complementary.rg;
    }
    if (complementary?.sexo) {
      merged.sexo = complementary.sexo;
    }

    return merged;
  }

  /**
   * Detecta se houve mudanças nos dados
   */
  private detectChanges(
    cached: any,
    newData: Record<string, any>
  ): boolean {
    const fieldsToCompare = ['nome', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep'];
    
    for (const field of fieldsToCompare) {
      const cachedValue = cached.complementaryData?.[field] || cached[field];
      const newValue = newData[field];
      
      if (cachedValue !== newValue) {
        logger.debug('Mudança detectada', { field, old: cachedValue, new: newValue });
        return true;
      }
    }

    return false;
  }
}

export default OrchestratorService;
