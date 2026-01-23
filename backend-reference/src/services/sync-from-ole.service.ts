// Serviço de Sincronização: Olé TV → Banco Local
// Responsável por buscar dados da API Olé TV e persistir no MySQL

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
      // Buscar todos os clientes da API Olé TV
      const response = await this.oleApi.listarTodosClientes();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao buscar clientes da Olé TV');
      }

      const clientes = Array.isArray(response.data) 
        ? response.data 
        : response.data.clientes || response.data.retorno || [];

      logger.info(`📋 ${clientes.length} clientes encontrados na Olé TV`);

      // Processar cada cliente
      for (const cliente of clientes) {
        try {
          await this.upsertCliente(cliente);
          result.synced++;
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          result.errors.push(`Cliente ${cliente.documento || cliente.id}: ${errorMsg}`);
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
    const documento = this.cleanDocument(
      oleCliente.documento || oleCliente.cpf || oleCliente.cnpj || ''
    );

    if (!documento) {
      throw new Error('Cliente sem documento válido');
    }

    await prisma.oleCliente.upsert({
      where: {
        integrationId_oleClienteId: {
          integrationId: this.integrationId,
          oleClienteId: String(oleCliente.id || oleCliente.idCliente),
        },
      },
      update: {
        documento,
        nome: oleCliente.nome || oleCliente.razao_social || '',
        email: oleCliente.email || null,
        telefone: oleCliente.telefone || oleCliente.celular || null,
        endereco: oleCliente.endereco || null,
        numero: oleCliente.numero || null,
        complemento: oleCliente.complemento || null,
        bairro: oleCliente.bairro || null,
        cidade: oleCliente.cidade || null,
        estado: oleCliente.estado || oleCliente.uf || null,
        cep: oleCliente.cep || null,
        status: oleCliente.status || oleCliente.situacao || 'ATIVO',
        rawData: oleCliente,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: String(oleCliente.id || oleCliente.idCliente),
        documento,
        nome: oleCliente.nome || oleCliente.razao_social || '',
        email: oleCliente.email || null,
        telefone: oleCliente.telefone || oleCliente.celular || null,
        endereco: oleCliente.endereco || null,
        numero: oleCliente.numero || null,
        complemento: oleCliente.complemento || null,
        bairro: oleCliente.bairro || null,
        cidade: oleCliente.cidade || null,
        estado: oleCliente.estado || oleCliente.uf || null,
        cep: oleCliente.cep || null,
        status: oleCliente.status || oleCliente.situacao || 'ATIVO',
        rawData: oleCliente,
        lastSyncAt: new Date(),
      },
    });
  }

  // ==========================================
  // SINCRONIZAÇÃO DE CONTRATOS
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
          const response = await this.oleApi.buscarContratos(cliente.oleClienteId);

          if (response.success && response.data) {
            const contratos = Array.isArray(response.data) 
              ? response.data 
              : response.data.contratos || response.data.retorno || [];

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
    const contratoId = String(oleContrato.id || oleContrato.idContrato || oleContrato.contrato);

    await prisma.oleContrato.upsert({
      where: {
        integrationId_oleContratoId: {
          integrationId: this.integrationId,
          oleContratoId: contratoId,
        },
      },
      update: {
        plano: oleContrato.plano || oleContrato.nome_plano || null,
        valor: oleContrato.valor ? parseFloat(oleContrato.valor) : null,
        dataInicio: oleContrato.data_inicio ? new Date(oleContrato.data_inicio) : null,
        dataVencimento: oleContrato.data_vencimento ? new Date(oleContrato.data_vencimento) : null,
        status: oleContrato.status || oleContrato.situacao || 'ATIVO',
        diaVencimento: oleContrato.dia_vencimento ? parseInt(oleContrato.dia_vencimento) : null,
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleContratoId: contratoId,
        plano: oleContrato.plano || oleContrato.nome_plano || null,
        valor: oleContrato.valor ? parseFloat(oleContrato.valor) : null,
        dataInicio: oleContrato.data_inicio ? new Date(oleContrato.data_inicio) : null,
        dataVencimento: oleContrato.data_vencimento ? new Date(oleContrato.data_vencimento) : null,
        status: oleContrato.status || oleContrato.situacao || 'ATIVO',
        diaVencimento: oleContrato.dia_vencimento ? parseInt(oleContrato.dia_vencimento) : null,
        rawData: oleContrato,
        lastSyncAt: new Date(),
      },
    });
  }

  // ==========================================
  // SINCRONIZAÇÃO DE BOLETOS
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
        select: { oleClienteId: true, id: true, documento: true },
      });

      logger.info(`📋 Buscando boletos de ${clientesLocais.length} clientes...`);

      for (const cliente of clientesLocais) {
        try {
          const response = await this.oleApi.listarBoletos(cliente.documento);

          if (response.success && response.data) {
            const boletos = Array.isArray(response.data) 
              ? response.data 
              : response.data.boletos || response.data.retorno || [];

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
    const boletoId = String(oleBoleto.id || oleBoleto.idBoleto || oleBoleto.nosso_numero);

    await prisma.oleBoleto.upsert({
      where: {
        integrationId_oleBoletoId: {
          integrationId: this.integrationId,
          oleBoletoId: boletoId,
        },
      },
      update: {
        valor: oleBoleto.valor ? parseFloat(oleBoleto.valor) : 0,
        dataVencimento: oleBoleto.data_vencimento ? new Date(oleBoleto.data_vencimento) : null,
        dataPagamento: oleBoleto.data_pagamento ? new Date(oleBoleto.data_pagamento) : null,
        status: oleBoleto.status || oleBoleto.situacao || 'PENDENTE',
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        codigoBarras: oleBoleto.codigo_barras || null,
        urlPdf: oleBoleto.url_pdf || oleBoleto.link_boleto || null,
        rawData: oleBoleto,
        lastSyncAt: new Date(),
      },
      create: {
        integrationId: this.integrationId,
        oleClienteId: oleClienteLocalId,
        oleBoletoId: boletoId,
        valor: oleBoleto.valor ? parseFloat(oleBoleto.valor) : 0,
        dataVencimento: oleBoleto.data_vencimento ? new Date(oleBoleto.data_vencimento) : null,
        dataPagamento: oleBoleto.data_pagamento ? new Date(oleBoleto.data_pagamento) : null,
        status: oleBoleto.status || oleBoleto.situacao || 'PENDENTE',
        linhaDigitavel: oleBoleto.linha_digitavel || null,
        codigoBarras: oleBoleto.codigo_barras || null,
        urlPdf: oleBoleto.url_pdf || oleBoleto.link_boleto || null,
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
