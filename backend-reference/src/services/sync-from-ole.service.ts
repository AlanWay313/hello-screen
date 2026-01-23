// Serviço de Sincronização: Olé TV → Banco Local
// Responsável por buscar dados da API Olé TV e persistir no MySQL
// Baseado na documentação oficial: /api-docs
// Inclui rate limiting e delay entre chamadas para evitar bloqueio

import { OleApiService } from './ole-api.service';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// ==========================================
// CONFIGURAÇÕES DE RATE LIMITING
// ==========================================

const RATE_LIMIT_CONFIG = {
  // Delay entre chamadas individuais (ms)
  DELAY_BETWEEN_CALLS: 300,
  
  // Delay entre lotes de clientes (ms)
  DELAY_BETWEEN_BATCHES: 1000,
  
  // Tamanho do lote para processar clientes
  BATCH_SIZE: 10,
  
  // Máximo de retentativas em caso de erro 429
  MAX_RETRIES: 3,
  
  // Delay inicial para retry (ms) - dobra a cada tentativa
  INITIAL_RETRY_DELAY: 2000,
  
  // Delay máximo para retry (ms)
  MAX_RETRY_DELAY: 30000,
};

// ==========================================
// TIPOS E INTERFACES
// ==========================================

interface SyncResult {
  success: boolean;
  entity: string;
  synced: number;
  failed: number;
  errors: string[];
  duration: number;
}

interface FullSyncResult {
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  results: {
    clientes: SyncResult;
    contratos: SyncResult;
    boletos: SyncResult;
  };
  totalSynced: number;
  totalFailed: number;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class SyncFromOleService {
  private oleApi: OleApiService;
  private integrationId: string;

  constructor(oleApi: OleApiService, integrationId: string) {
    this.oleApi = oleApi;
    this.integrationId = integrationId;
  }

  // Factory para criar instância a partir do ID da integração
  static async fromIntegration(integrationId: string): Promise<SyncFromOleService> {
    const oleApi = await OleApiService.fromIntegration(integrationId);
    return new SyncFromOleService(oleApi, integrationId);
  }

  // ==========================================
  // UTILITÁRIOS DE RATE LIMITING
  // ==========================================

  /**
   * Aguarda um tempo especificado (delay)
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executa uma função com retry e backoff exponencial
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    context: string,
    maxRetries: number = RATE_LIMIT_CONFIG.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;
    let retryDelay = RATE_LIMIT_CONFIG.INITIAL_RETRY_DELAY;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Verifica se é erro de rate limit (429) ou timeout
        const isRateLimited = error.response?.status === 429 || 
                              error.message?.includes('rate limit') ||
                              error.message?.includes('too many requests');
        
        if (isRateLimited && attempt < maxRetries) {
          logger.warn(`⏳ Rate limit detectado em ${context}. Tentativa ${attempt}/${maxRetries}. Aguardando ${retryDelay}ms...`);
          await this.delay(retryDelay);
          
          // Backoff exponencial com limite máximo
          retryDelay = Math.min(retryDelay * 2, RATE_LIMIT_CONFIG.MAX_RETRY_DELAY);
        } else if (attempt < maxRetries) {
          logger.warn(`⚠️ Erro em ${context}. Tentativa ${attempt}/${maxRetries}. Aguardando ${retryDelay}ms...`);
          await this.delay(retryDelay);
        }
      }
    }

    throw lastError || new Error(`Falha após ${maxRetries} tentativas: ${context}`);
  }

  /**
   * Processa itens em lotes com delay entre eles
   */
  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = RATE_LIMIT_CONFIG.BATCH_SIZE
  ): Promise<{ results: R[]; errors: string[] }> {
    const results: R[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(items.length / batchSize);

      logger.info(`📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} itens)...`);

      // Processa cada item do lote com delay
      for (let j = 0; j < batch.length; j++) {
        try {
          const result = await processor(batch[j], i + j);
          results.push(result);
          
          // Delay entre chamadas individuais
          if (j < batch.length - 1) {
            await this.delay(RATE_LIMIT_CONFIG.DELAY_BETWEEN_CALLS);
          }
        } catch (error: any) {
          errors.push(error.message || 'Erro desconhecido');
        }
      }

      // Delay entre lotes (exceto no último)
      if (i + batchSize < items.length) {
        logger.info(`⏳ Aguardando ${RATE_LIMIT_CONFIG.DELAY_BETWEEN_BATCHES}ms antes do próximo lote...`);
        await this.delay(RATE_LIMIT_CONFIG.DELAY_BETWEEN_BATCHES);
      }
    }

    return { results, errors };
  }

  // ==========================================
  // SINCRONIZAÇÃO DE CLIENTES
  // Endpoint: POST /clientes/listar
  // Retorno: { retorno_status: true, lista: [...] }
  // ==========================================

  async syncClientes(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      entity: 'clientes',
      synced: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    logger.info('🔄 Iniciando sincronização de clientes da Olé TV...');

    try {
      // Buscar todos os clientes via POST /clientes/listar (com retry)
      const response = await this.withRetry(
        () => this.oleApi.listarClientes(),
        'listarClientes'
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao buscar clientes da Olé TV');
      }

      const data = response.data;
      
      if (!data.retorno_status) {
        throw new Error(data.msg || 'API retornou erro: retorno_status = false');
      }

      const clientes = data.lista || [];
      logger.info(`📋 ${clientes.length} clientes encontrados na Olé TV`);

      // Processa clientes em lotes com delay
      const { errors } = await this.processInBatches(
        clientes,
        async (cliente) => {
          await this.upsertCliente(cliente);
          result.synced++;
          return cliente;
        }
      );

      result.failed = errors.length;
      result.errors = errors;

      logger.info(`✅ Clientes sincronizados: ${result.synced} | Falhas: ${result.failed}`);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.error(`❌ Falha na sincronização de clientes: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertCliente(oleCliente: any): Promise<void> {
    const documento = this.cleanDocument(oleCliente.cpf_cnpj || '');

    if (!documento) {
      throw new Error('Cliente sem documento válido');
    }

    const oleClienteId = String(oleCliente.id);

    await prisma.oleCliente.upsert({
      where: {
        integrationId_oleClienteId: {
          integrationId: this.integrationId,
          oleClienteId,
        },
      },
      update: {
        documento,
        nome: oleCliente.nome || '',
        email: oleCliente.email || null,
        telefone: oleCliente.telefone || null,
        status: oleCliente.status || 'Ativo',
        rawData: oleCliente,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId,
        documento,
        nome: oleCliente.nome || '',
        email: oleCliente.email || null,
        telefone: oleCliente.telefone || null,
        status: oleCliente.status || 'Ativo',
        rawData: oleCliente,
        lastSyncAt: new Date(),
      },
    });
  }

  // ==========================================
  // SINCRONIZAÇÃO DE CONTRATOS
  // Endpoint: POST /contratos/listar/{id_cliente}
  // Retorno: { retorno_status: true, contratos: [...] }
  // ==========================================

  async syncContratos(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      entity: 'contratos',
      synced: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    logger.info('🔄 Iniciando sincronização de contratos da Olé TV...');

    try {
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleClienteId: true, id: true },
      });

      logger.info(`📋 Buscando contratos de ${clientesLocais.length} clientes...`);

      // Processa clientes em lotes para buscar contratos
      await this.processInBatches(
        clientesLocais,
        async (cliente) => {
          try {
            const response = await this.withRetry(
              () => this.oleApi.listarContratos(cliente.oleClienteId),
              `listarContratos(${cliente.oleClienteId})`
            );

            if (response.success && response.data && response.data.retorno_status) {
              const contratos = response.data.contratos || [];

              for (const contrato of contratos) {
                await this.upsertContrato(cliente.id, contrato);
                result.synced++;
                
                // Pequeno delay entre contratos do mesmo cliente
                await this.delay(50);
              }
            }
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            result.errors.push(`Contratos cliente ${cliente.oleClienteId}: ${errorMsg}`);
          }
          return cliente;
        }
      );

      logger.info(`✅ Contratos sincronizados: ${result.synced} | Falhas: ${result.failed}`);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.error(`❌ Falha na sincronização de contratos: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertContrato(oleClienteLocalId: string, oleContrato: any): Promise<void> {
    const contratoId = String(oleContrato.id);

    await prisma.oleContrato.upsert({
      where: {
        integrationId_oleContratoId: {
          integrationId: this.integrationId,
          oleContratoId: contratoId,
        },
      },
      update: {
        plano: oleContrato.tipo || oleContrato.servico || null,
        codigo: oleContrato.codigo || null,
        dataInicio: oleContrato.data_ativacao ? this.parseDataBR(oleContrato.data_ativacao) : null,
        status: oleContrato.status || 'Ativo',
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleContratoId: contratoId,
        plano: oleContrato.tipo || oleContrato.servico || null,
        codigo: oleContrato.codigo || null,
        dataInicio: oleContrato.data_ativacao ? this.parseDataBR(oleContrato.data_ativacao) : null,
        status: oleContrato.status || 'Ativo',
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
    });
  }

  // ==========================================
  // SINCRONIZAÇÃO DE BOLETOS
  // Endpoint: POST /boletos/listar/{id_cliente}
  // Retorno: { retorno_status: true, boletos: [...] }
  // ==========================================

  async syncBoletos(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      entity: 'boletos',
      synced: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    logger.info('🔄 Iniciando sincronização de boletos da Olé TV...');

    try {
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleClienteId: true, id: true },
      });

      logger.info(`📋 Buscando boletos de ${clientesLocais.length} clientes...`);

      // Processa clientes em lotes para buscar boletos
      await this.processInBatches(
        clientesLocais,
        async (cliente) => {
          try {
            const response = await this.withRetry(
              () => this.oleApi.listarBoletos(cliente.oleClienteId),
              `listarBoletos(${cliente.oleClienteId})`
            );

            if (response.success && response.data && response.data.retorno_status) {
              const boletos = response.data.boletos || [];

              for (const boleto of boletos) {
                await this.upsertBoleto(cliente.id, boleto);
                result.synced++;
                
                // Pequeno delay entre boletos do mesmo cliente
                await this.delay(50);
              }
            }
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            result.errors.push(`Boletos cliente ${cliente.oleClienteId}: ${errorMsg}`);
          }
          return cliente;
        }
      );

      logger.info(`✅ Boletos sincronizados: ${result.synced} | Falhas: ${result.failed}`);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.error(`❌ Falha na sincronização de boletos: ${errorMsg}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertBoleto(oleClienteLocalId: string, oleBoleto: any): Promise<void> {
    const boletoId = String(oleBoleto.id);
    const valorStr = oleBoleto.valores?.valor || oleBoleto.valor || '0';
    const valor = this.parseValorBR(valorStr);

    await prisma.oleBoleto.upsert({
      where: {
        integrationId_oleBoletoId: {
          integrationId: this.integrationId,
          oleBoletoId: boletoId,
        },
      },
      update: {
        valor,
        dataVencimento: oleBoleto.datas?.vencimento ? this.parseDataBR(oleBoleto.datas.vencimento) : null,
        dataPagamento: oleBoleto.datas?.pagamento ? this.parseDataBR(oleBoleto.datas.pagamento) : null,
        status: oleBoleto.status || 'Em Aberto',
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        codigoBarras: oleBoleto.codigo || null,
        rawData: oleBoleto,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleBoletoId: boletoId,
        valor,
        dataVencimento: oleBoleto.datas?.vencimento ? this.parseDataBR(oleBoleto.datas.vencimento) : null,
        dataPagamento: oleBoleto.datas?.pagamento ? this.parseDataBR(oleBoleto.datas.pagamento) : null,
        status: oleBoleto.status || 'Em Aberto',
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        codigoBarras: oleBoleto.codigo || null,
        rawData: oleBoleto,
        lastSyncAt: new Date(),
      },
    });
  }

  // ==========================================
  // SINCRONIZAÇÃO COMPLETA
  // ==========================================

  async syncAll(): Promise<FullSyncResult> {
    const startedAt = new Date();
    logger.info('🚀 Iniciando sincronização completa Olé TV → Banco Local...');
    logger.info(`⚙️ Rate Limiting: ${RATE_LIMIT_CONFIG.DELAY_BETWEEN_CALLS}ms entre chamadas, lotes de ${RATE_LIMIT_CONFIG.BATCH_SIZE}`);

    // Executar sincronizações em sequência (contratos e boletos dependem de clientes)
    const clientesResult = await this.syncClientes();
    const contratosResult = await this.syncContratos();
    const boletosResult = await this.syncBoletos();

    const completedAt = new Date();

    // Atualizar timestamp da última sincronização
    await prisma.integration.update({
      where: { id: this.integrationId },
      data: { lastSync: completedAt },
    });

    const result: FullSyncResult = {
      success: clientesResult.success && contratosResult.success && boletosResult.success,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      results: {
        clientes: clientesResult,
        contratos: contratosResult,
        boletos: boletosResult,
      },
      totalSynced: clientesResult.synced + contratosResult.synced + boletosResult.synced,
      totalFailed: clientesResult.failed + contratosResult.failed + boletosResult.failed,
    };

    logger.info(`✅ Sincronização completa finalizada em ${result.duration}ms`);
    logger.info(`📊 Total: ${result.totalSynced} registros | Falhas: ${result.totalFailed}`);

    return result;
  }

  // ==========================================
  // UTILITÁRIOS
  // ==========================================

  private cleanDocument(doc: string): string {
    return doc.replace(/\D/g, '');
  }

  private parseDataBR(dataBR: string): Date | null {
    if (!dataBR) return null;
    const parts = dataBR.split('/');
    if (parts.length !== 3) return null;
    const [dia, mes, ano] = parts;
    return new Date(`${ano}-${mes}-${dia}`);
  }

  private parseValorBR(valorBR: string): number {
    if (!valorBR) return 0;
    const cleaned = valorBR
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  async getLocalStats(): Promise<{
    clientes: number;
    contratos: number;
    boletos: number;
    lastSync: Date | null;
  }> {
    const [clientes, contratos, boletos, integration] = await Promise.all([
      prisma.oleCliente.count({ where: { integrationId: this.integrationId } }),
      prisma.oleContrato.count({ where: { integrationId: this.integrationId } }),
      prisma.oleBoleto.count({ where: { integrationId: this.integrationId } }),
      prisma.integration.findUnique({
        where: { id: this.integrationId },
        select: { lastSync: true },
      }),
    ]);

    return {
      clientes,
      contratos,
      boletos,
      lastSync: integration?.lastSync || null,
    };
  }
}

export default SyncFromOleService;
