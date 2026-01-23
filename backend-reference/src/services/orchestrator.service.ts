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
   */
  private async handleCreate(payload: WebhookPayload): Promise<OrchestrationResult> {
    const oleApi = await this.getOleApi();

    // 1. Busca dados complementares na API externa
    logger.info('Buscando dados complementares...', { documento: payload.documento });
    const complementaryData = await this.externalApi.buscarCliente(payload.documento);

    // 2. Mescla dados do webhook com dados complementares
    const clienteData = this.mergeClientData(payload, complementaryData);

    // 3. Verifica se cliente já existe na Olé
    logger.info('Verificando cliente na Olé...', { documento: payload.documento });
    const oleClientResult = await oleApi.buscarCliente(payload.documento);

    // 4. Decisão baseada no estado atual
    if (oleClientResult.success && oleClientResult.data) {
      const oleClient = oleClientResult.data;

      // Cliente existe - verificar status
      if (oleClient.status === 'cancelled' || oleClient.status === 'inactive') {
        // Reativar cliente
        return await this.reactivateClient(oleClient.id, clienteData, payload);
      } else {
        // Cliente já ativo - apenas atualizar
        return await this.updateClient(oleClient.id, clienteData, payload);
      }
    }

    // 5. Cliente não existe - criar
    return await this.createClient(clienteData, payload);
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
   * Cria novo cliente
   */
  private async createClient(
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload
  ): Promise<OrchestrationResult> {
    // Adiciona à fila
    const queueId = await this.syncQueue.addToQueue('CREATE_CLIENT', clienteData, {
      priority: 1, // Alta prioridade para criação
    });

    // Salva no cache local
    await prisma.clientCache.create({
      data: {
        integrationId: this.integrationId,
        externalId: originalPayload.externalId,
        document: originalPayload.documento,
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
        complementaryData: clienteData,
        status: 'PENDING_SYNC',
      },
    });

    return {
      success: true,
      action: 'queued',
      message: 'Cliente adicionado à fila de criação',
      data: { queueId },
    };
  }

  /**
   * Atualiza cliente existente
   */
  private async updateClient(
    oleClientId: string,
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload
  ): Promise<OrchestrationResult> {
    const queueId = await this.syncQueue.addToQueue('UPDATE_CLIENT', {
      idCliente: oleClientId,
      ...clienteData,
    });

    // Atualiza cache
    await prisma.clientCache.updateMany({
      where: {
        integrationId: this.integrationId,
        externalId: originalPayload.externalId,
      },
      data: {
        name: clienteData.nome,
        email: clienteData.email,
        phone: clienteData.telefone,
        complementaryData: clienteData,
        status: 'PENDING_SYNC',
      },
    });

    return {
      success: true,
      action: 'queued',
      message: 'Atualização adicionada à fila',
      data: { queueId },
    };
  }

  /**
   * Reativa cliente cancelado
   */
  private async reactivateClient(
    oleClientId: string,
    clienteData: Record<string, any>,
    originalPayload: WebhookPayload
  ): Promise<OrchestrationResult> {
    // Primeiro reativa, depois atualiza dados
    await this.syncQueue.addToQueue('REACTIVATE_CLIENT', {
      idCliente: oleClientId,
    }, { priority: 2 });

    const queueId = await this.syncQueue.addToQueue('UPDATE_CLIENT', {
      idCliente: oleClientId,
      ...clienteData,
    }, { priority: 1 });

    return {
      success: true,
      action: 'queued',
      message: 'Reativação e atualização adicionadas à fila',
      data: { queueId },
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
