// Serviço de Sincronização: Olé TV → Banco Local
// Responsável por buscar dados da API Olé TV e persistir no MySQL
// Baseado na documentação oficial: /api-docs
// Inclui rate limiting e delay entre chamadas para evitar bloqueio

import { OleApiService } from './ole-api.service';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// ==========================================
// CONFIGURAÇÕES DE RATE LIMITING E PERFORMANCE
// ==========================================

// Modos de sincronização: 'fast' para alta performance, 'safe' para evitar rate limit
type SyncMode = 'fast' | 'safe';

const RATE_LIMIT_PROFILES = {
  // Modo rápido: para APIs que aguentam mais carga (17k+ clientes)
  fast: {
    DELAY_BETWEEN_CALLS: 50,        // 50ms entre chamadas
    DELAY_BETWEEN_BATCHES: 200,     // 200ms entre lotes
    BATCH_SIZE: 100,                // 100 clientes por lote
    PARALLEL_REQUESTS: 10,          // 10 requests simultâneos
    MAX_RETRIES: 5,
    INITIAL_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 60000,
  },
  // Modo seguro: para evitar rate limiting
  safe: {
    DELAY_BETWEEN_CALLS: 200,       // 200ms entre chamadas
    DELAY_BETWEEN_BATCHES: 500,     // 500ms entre lotes
    BATCH_SIZE: 25,                 // 25 clientes por lote
    PARALLEL_REQUESTS: 5,           // 5 requests simultâneos
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 2000,
    MAX_RETRY_DELAY: 30000,
  },
};

// Configuração ativa (pode ser alterada via ENV ou parâmetro)
const SYNC_MODE: SyncMode = (process.env.SYNC_MODE as SyncMode) || 'fast';
const RATE_LIMIT_CONFIG = RATE_LIMIT_PROFILES[SYNC_MODE];

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
  // Contadores extras para relacionamentos
  assinaturas?: number;
  equipamentos?: number;
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
   * Processa itens em lotes com PARALELISMO dentro de cada lote
   * Otimizado para alto volume (17k+ registros)
   */
  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = RATE_LIMIT_CONFIG.BATCH_SIZE,
    entityName: string = 'itens'
  ): Promise<{ results: R[]; errors: string[] }> {
    const results: R[] = [];
    const errors: string[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);
    const parallelLimit = RATE_LIMIT_CONFIG.PARALLEL_REQUESTS;

    logger.info(`⚡ Modo: ${SYNC_MODE.toUpperCase()} | Batch: ${batchSize} | Paralelo: ${parallelLimit}`);

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      // Log do lote atual
      logger.syncBatch(batchNumber, totalBatches, batch.length);

      // Processa o lote com paralelismo controlado
      const batchResults = await this.processWithConcurrency(
        batch,
        async (item, localIndex) => {
          const globalIndex = i + localIndex;
          try {
            const result = await processor(item, globalIndex);
            
            // Atualiza progresso a cada 10 itens para não sobrecarregar o console
            if ((globalIndex + 1) % 10 === 0 || globalIndex + 1 === items.length) {
              logger.syncProgress(entityName, globalIndex + 1, items.length);
            }
            
            return { success: true, result };
          } catch (error: any) {
            return { success: false, error: error.message || 'Erro desconhecido' };
          }
        },
        parallelLimit
      );

      // Coleta resultados e erros
      for (const res of batchResults) {
        if (res.success) {
          results.push(res.result);
        } else {
          errors.push(res.error);
        }
      }

      // Delay entre lotes (exceto no último)
      if (i + batchSize < items.length) {
        await this.delay(RATE_LIMIT_CONFIG.DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(''); // Nova linha final
    return { results, errors };
  }

  /**
   * Processa array com limite de concorrência (semáforo)
   * Evita abrir milhares de conexões simultâneas
   */
  private async processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    limit: number
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        await this.delay(RATE_LIMIT_CONFIG.DELAY_BETWEEN_CALLS);
        results[index] = await processor(items[index], index);
      }
    });

    await Promise.all(workers);
    return results;
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

    logger.syncStart('Clientes');

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
      logger.info(`📋 ${clientes.length} clientes encontrados na API Olé TV`);

      // Processa clientes em lotes com delay
      const { errors } = await this.processInBatches(
        clientes,
        async (cliente) => {
          await this.upsertCliente(cliente);
          result.synced++;
          return cliente;
        },
        RATE_LIMIT_CONFIG.BATCH_SIZE,
        'clientes'
      );

      result.failed = errors.length;
      result.errors = errors;

      logger.syncComplete('Clientes', result.synced, result.failed, Date.now() - startTime);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.syncError('Clientes', errorMsg);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertCliente(oleCliente: any): Promise<void> {
    const cpfCnpj = oleCliente.cpf_cnpj || '';
    const oleId = String(oleCliente.id);

    if (!cpfCnpj) {
      throw new Error('Cliente sem CPF/CNPJ válido');
    }

    await prisma.oleCliente.upsert({
      where: {
        integrationId_oleId: {
          integrationId: this.integrationId,
          oleId: oleId,
        },
      },
      update: {
        nome: oleCliente.nome || '',
        cpfCnpj: cpfCnpj,
        dataNascimento: oleCliente.data_nascimento || null,
        dataCadastro: oleCliente.data_cadastro || null,
        status: oleCliente.status || 'Ativo',
        rawData: oleCliente,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleId: oleId,
        nome: oleCliente.nome || '',
        cpfCnpj: cpfCnpj,
        dataNascimento: oleCliente.data_nascimento || null,
        dataCadastro: oleCliente.data_cadastro || null,
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
      assinaturas: 0,
      equipamentos: 0,
    };

    logger.syncStart('Contratos + Assinaturas + Equipamentos');

    try {
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleId: true, id: true, nome: true },
      });

      logger.info(`📋 Buscando contratos de ${clientesLocais.length} clientes locais...`);

      // Processa clientes em lotes para buscar contratos
      await this.processInBatches(
        clientesLocais,
        async (cliente, index) => {
          try {
            const response = await this.withRetry(
              () => this.oleApi.listarContratos(cliente.oleId),
              `listarContratos(${cliente.oleId})`
            );

            if (response.success && response.data && response.data.retorno_status) {
              const contratos = response.data.contratos || [];

              if (contratos.length > 0) {
                let totalAssinaturas = 0;
                let totalEquipamentos = 0;

                for (const contrato of contratos) {
                  const counts = await this.upsertContrato(cliente.id, contrato);
                  result.synced++;
                  result.assinaturas! += counts.assinaturas;
                  result.equipamentos! += counts.equipamentos;
                  totalAssinaturas += counts.assinaturas;
                  totalEquipamentos += counts.equipamentos;
                  await this.delay(50);
                }

                logger.clientSync(
                  cliente.oleId, 
                  cliente.nome || 'N/A', 
                  `${contratos.length} contrato(s), ${totalAssinaturas} assinatura(s), ${totalEquipamentos} equipamento(s)`
                );
              } else {
                logger.syncSkip(`Cliente ${cliente.oleId}`, 'sem contratos');
              }
            } else {
              logger.syncSkip(`Cliente ${cliente.oleId}`, 'sem contratos');
            }
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            result.errors.push(`Contratos cliente ${cliente.oleId}: ${errorMsg}`);
          }
          return cliente;
        },
        RATE_LIMIT_CONFIG.BATCH_SIZE,
        'contratos'
      );

      logger.info(`   📊 Assinaturas: ${result.assinaturas} | Equipamentos: ${result.equipamentos}`);
      logger.syncComplete('Contratos', result.synced, result.failed, Date.now() - startTime);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.syncError('Contratos', errorMsg);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Insere ou atualiza um contrato e seus relacionamentos:
   * Contrato → Assinaturas → Equipamentos
   */
  private async upsertContrato(oleClienteLocalId: string, oleContrato: any): Promise<{ assinaturas: number; equipamentos: number }> {
    const contratoOleId = String(oleContrato.id);
    let totalAssinaturas = 0;
    let totalEquipamentos = 0;

    // 1. Upsert do Contrato
    const contrato = await prisma.oleContrato.upsert({
      where: {
        integrationId_oleId: {
          integrationId: this.integrationId,
          oleId: contratoOleId,
        },
      },
      update: {
        codigo: oleContrato.codigo || null,
        tipo: oleContrato.tipo || null,
        servico: oleContrato.servico || null,
        dataGeracao: oleContrato.data_geracao || null,
        dataAtivacao: oleContrato.data_ativacao || null,
        status: oleContrato.status || 'Ativo',
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleId: contratoOleId,
        codigo: oleContrato.codigo || null,
        tipo: oleContrato.tipo || null,
        servico: oleContrato.servico || null,
        dataGeracao: oleContrato.data_geracao || null,
        dataAtivacao: oleContrato.data_ativacao || null,
        status: oleContrato.status || 'Ativo',
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
    });

    // 2. Processar Assinaturas do contrato
    const assinaturas = oleContrato.assinaturas || [];
    
    for (const assinatura of assinaturas) {
      const assinaturaOleId = String(assinatura.id);

      const assinaturaLocal = await prisma.oleAssinatura.upsert({
        where: {
          integrationId_oleId: {
            integrationId: this.integrationId,
            oleId: assinaturaOleId,
          },
        },
        update: {
          plano: assinatura.plano || null,
          box: assinatura.box || null,
          dispositivos: assinatura.dispositivos || null,
          statusAssinatura: assinatura.status_assinatura || null,
          rawData: assinatura,
          lastSyncAt: new Date(),
        },
        create: {
          integrationId: this.integrationId,
          oleContratoId: contrato.id,
          oleId: assinaturaOleId,
          plano: assinatura.plano || null,
          box: assinatura.box || null,
          dispositivos: assinatura.dispositivos || null,
          statusAssinatura: assinatura.status_assinatura || null,
          rawData: assinatura,
          lastSyncAt: new Date(),
        },
      });

      totalAssinaturas++;

      // 3. Processar Equipamentos da assinatura
      const equipamentos = assinatura.equipamentos || [];
      
      for (const equipamento of equipamentos) {
        const equipamentoOleId = String(equipamento.id);

        await prisma.oleEquipamentoContrato.upsert({
          where: {
            integrationId_oleId: {
              integrationId: this.integrationId,
              oleId: equipamentoOleId,
            },
          },
          update: {
            equipamento: equipamento.equipamento || null,
            mac: equipamento.mac || null,
            dataInicio: equipamento.data_inicio || null,
            statusEquipamento: equipamento.status_equipamento || null,
            rawData: equipamento,
            lastSyncAt: new Date(),
          },
          create: {
            integrationId: this.integrationId,
            oleAssinaturaId: assinaturaLocal.id,
            oleId: equipamentoOleId,
            equipamento: equipamento.equipamento || null,
            mac: equipamento.mac || null,
            dataInicio: equipamento.data_inicio || null,
            statusEquipamento: equipamento.status_equipamento || null,
            rawData: equipamento,
            lastSyncAt: new Date(),
          },
        });

        totalEquipamentos++;
      }
    }

    return { assinaturas: totalAssinaturas, equipamentos: totalEquipamentos };
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

    logger.syncStart('Boletos');

    try {
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleId: true, id: true, nome: true },
      });

      logger.info(`📋 Buscando boletos de ${clientesLocais.length} clientes locais...`);

      // Processa clientes em lotes para buscar boletos
      await this.processInBatches(
        clientesLocais,
        async (cliente, index) => {
          try {
            const response = await this.withRetry(
              () => this.oleApi.listarBoletos(cliente.oleId),
              `listarBoletos(${cliente.oleId})`
            );

            if (response.success && response.data && response.data.retorno_status) {
              const boletos = response.data.boletos || [];

              if (boletos.length > 0) {
                logger.clientSync(cliente.oleId, cliente.nome || 'N/A', `${boletos.length} boleto(s)`);
              }

              for (const boleto of boletos) {
                await this.upsertBoleto(cliente.id, boleto);
                result.synced++;
                await this.delay(50);
              }
            } else {
              logger.syncSkip(`Cliente ${cliente.oleId}`, 'sem boletos');
            }
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            result.errors.push(`Boletos cliente ${cliente.oleId}: ${errorMsg}`);
          }
          return cliente;
        },
        RATE_LIMIT_CONFIG.BATCH_SIZE,
        'boletos'
      );

      logger.syncComplete('Boletos', result.synced, result.failed, Date.now() - startTime);

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      result.errors.push(errorMsg);
      logger.syncError('Boletos', errorMsg);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertBoleto(oleClienteLocalId: string, oleBoleto: any): Promise<void> {
    const oleId = String(oleBoleto.id);

    // Extrai objetos aninhados
    const datas = oleBoleto.datas || {};
    const valores = oleBoleto.valores || {};

    await prisma.oleBoleto.upsert({
      where: {
        integrationId_oleId: {
          integrationId: this.integrationId,
          oleId: oleId,
        },
      },
      update: {
        codigo: oleBoleto.codigo || null,
        formato: oleBoleto.formato || null,
        referente: oleBoleto.referente || null,
        dataGeracao: datas.geracao || null,
        dataVencimento: datas.vencimento || null,
        dataPagamento: datas.pagamento || null,
        valorBonificacao: valores.bonificacao || null,
        valorTotal: valores.valor || null,
        nossoNumero: oleBoleto.nosso_numero || null,
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        status: oleBoleto.status || 'Em Aberto',
        rawData: oleBoleto,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleId: oleId,
        codigo: oleBoleto.codigo || null,
        formato: oleBoleto.formato || null,
        referente: oleBoleto.referente || null,
        dataGeracao: datas.geracao || null,
        dataVencimento: datas.vencimento || null,
        dataPagamento: datas.pagamento || null,
        valorBonificacao: valores.bonificacao || null,
        valorTotal: valores.valor || null,
        nossoNumero: oleBoleto.nosso_numero || null,
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        status: oleBoleto.status || 'Em Aberto',
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
    
    // Log visual de início
    logger.fullSyncStart();

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

    // Log visual de conclusão
    logger.fullSyncComplete({
      totalSynced: result.totalSynced,
      totalFailed: result.totalFailed,
      duration: result.duration,
      clientes: { synced: clientesResult.synced, failed: clientesResult.failed },
      contratos: { synced: contratosResult.synced, failed: contratosResult.failed },
      boletos: { synced: boletosResult.synced, failed: boletosResult.failed },
    });

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
    assinaturas: number;
    equipamentos: number;
    boletos: number;
    lastSync: Date | null;
  }> {
    const [clientes, contratos, assinaturas, equipamentos, boletos, integration] = await Promise.all([
      prisma.oleCliente.count({ where: { integrationId: this.integrationId } }),
      prisma.oleContrato.count({ where: { integrationId: this.integrationId } }),
      prisma.oleAssinatura.count({ where: { integrationId: this.integrationId } }),
      prisma.oleEquipamentoContrato.count({ where: { integrationId: this.integrationId } }),
      prisma.oleBoleto.count({ where: { integrationId: this.integrationId } }),
      prisma.integration.findUnique({
        where: { id: this.integrationId },
        select: { lastSync: true },
      }),
    ]);

    return {
      clientes,
      contratos,
      assinaturas,
      equipamentos,
      boletos,
      lastSync: integration?.lastSync || null,
    };
  }
}

export default SyncFromOleService;
