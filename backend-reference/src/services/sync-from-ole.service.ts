// Serviço de Sincronização: Olé TV → Banco Local
// Responsável por buscar dados da API Olé TV e persistir no MySQL
// Baseado na documentação oficial: /api-docs

import { OleApiService } from './ole-api.service';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

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
      // Buscar todos os clientes via POST /clientes/listar
      const response = await this.oleApi.listarClientes();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao buscar clientes da Olé TV');
      }

      // Estrutura da resposta: { retorno_status: true, lista: [...] }
      const data = response.data;
      
      if (!data.retorno_status) {
        throw new Error(data.msg || 'API retornou erro: retorno_status = false');
      }

      const clientes = data.lista || [];
      logger.info(`📋 ${clientes.length} clientes encontrados na Olé TV`);

      // Processar cada cliente
      for (const cliente of clientes) {
        try {
          await this.upsertCliente(cliente);
          result.synced++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          result.errors.push(`Cliente ${cliente.cpf_cnpj || cliente.id}: ${errorMsg}`);
          logger.error(`Erro ao sincronizar cliente: ${errorMsg}`);
        }
      }

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
    // Estrutura do cliente da API:
    // { id, nome, cpf_cnpj, data_nascimento, data_cadastro }
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
      // Buscar clientes locais para obter contratos de cada um
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleClienteId: true, id: true },
      });

      logger.info(`📋 Buscando contratos de ${clientesLocais.length} clientes...`);

      for (const cliente of clientesLocais) {
        try {
          // POST /contratos/listar/{id_cliente}
          const response = await this.oleApi.listarContratos(cliente.oleClienteId);

          if (response.success && response.data && response.data.retorno_status) {
            // Estrutura: { retorno_status: true, contratos: [...] }
            const contratos = response.data.contratos || [];

            for (const contrato of contratos) {
              await this.upsertContrato(cliente.id, contrato);
              result.synced++;
            }
          }
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          result.errors.push(`Contratos cliente ${cliente.oleClienteId}: ${errorMsg}`);
        }
      }

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
    // Estrutura do contrato da API:
    // { id, codigo, tipo, servico, data_geracao, data_ativacao, status, assinaturas: [...] }
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
      // Buscar clientes locais para obter boletos de cada um
      const clientesLocais = await prisma.oleCliente.findMany({
        where: { integrationId: this.integrationId },
        select: { oleClienteId: true, id: true },
      });

      logger.info(`📋 Buscando boletos de ${clientesLocais.length} clientes...`);

      for (const cliente of clientesLocais) {
        try {
          // POST /boletos/listar/{id_cliente}
          const response = await this.oleApi.listarBoletos(cliente.oleClienteId);

          if (response.success && response.data && response.data.retorno_status) {
            // Estrutura: { retorno_status: true, boletos: [...] }
            const boletos = response.data.boletos || [];

            for (const boleto of boletos) {
              await this.upsertBoleto(cliente.id, boleto);
              result.synced++;
            }
          }
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          result.errors.push(`Boletos cliente ${cliente.oleClienteId}: ${errorMsg}`);
        }
      }

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
    // Estrutura do boleto da API:
    // { id, codigo, formato, datas: { geracao, vencimento, pagamento }, valores: { valor }, status, linha_digitavel }
    const boletoId = String(oleBoleto.id);

    // Parse do valor (formato "R$ 99,99" → 99.99)
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

  // Parse data no formato BR (dd/mm/aaaa) → Date
  private parseDataBR(dataBR: string): Date | null {
    if (!dataBR) return null;
    const parts = dataBR.split('/');
    if (parts.length !== 3) return null;
    const [dia, mes, ano] = parts;
    return new Date(`${ano}-${mes}-${dia}`);
  }

  // Parse valor no formato BR (R$ 99,99 ou 99,99) → number
  private parseValorBR(valorBR: string): number {
    if (!valorBR) return 0;
    const cleaned = valorBR
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // Estatísticas do banco local
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
