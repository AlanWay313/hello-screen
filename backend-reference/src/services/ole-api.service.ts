// Serviço de Integração com API Olé TV
// Baseado na documentação oficial: /api-docs
import FormData from 'form-data';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { decrypt } from '../lib/encryption';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

// ==========================================
// TIPOS E INTERFACES
// ==========================================

interface OleCredentials {
  keyapi: string;
  login: string;
  password: string;
}

interface OleApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

interface ClienteOleData {
  nome: string;
  tipo_pessoa: 'F' | 'J';
  cpf_cnpj: string;
  dia_vencimento: number;
  endereco_cobranca: boolean;
  nome_fantasia?: string;
  data_nascimento?: string;
  endereco_cep?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  telefone_ddd?: string[];
  telefone_numero?: string[];
  email?: string[];
  [key: string]: any;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class OleApiService {
  private client: AxiosInstance;
  private credentials: OleCredentials;
  private integrationId: string;

  constructor(integrationId: string, credentials: OleCredentials) {
    this.integrationId = integrationId;
    this.credentials = credentials;
    
    this.client = axios.create({
      baseURL: env.OLE_API_BASE_URL, // https://api.oletv.net.br
      timeout: parseInt(env.OLE_API_TIMEOUT),
    });
  }

  // ==========================================
  // FACTORY - Cria instância a partir do banco
  // ==========================================

  static async fromIntegration(integrationId: string): Promise<OleApiService> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integração não encontrada: ${integrationId}`);
    }

    if (!integration.isActive) {
      throw new Error(`Integração desativada: ${integrationId}`);
    }

    const credentials: OleCredentials = {
      keyapi: integration.oleKeyapi,
      login: integration.oleLogin,
      password: decrypt(integration.olePassword),
    };

    return new OleApiService(integrationId, credentials);
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private createFormData(params: Record<string, any>): FormData {
    const formData = new FormData();
    
    // Adiciona credenciais obrigatórias
    formData.append('keyapi', this.credentials.keyapi);
    formData.append('login', this.credentials.login);
    formData.append('pass', this.credentials.password);
    
    // Adiciona parâmetros extras
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, String(v)));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return formData;
  }

  private async logRequest(
    endpoint: string,
    request: any,
    response: any,
    statusCode: number,
    duration: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.syncLog.create({
        data: {
          integrationId: this.integrationId,
          endpoint,
          method: 'POST',
          requestBody: request,
          responseBody: response,
          statusCode,
          duration,
          success,
          errorMessage,
        },
      });
    } catch (error) {
      logger.error('Falha ao salvar log de sincronização', { error });
    }
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<OleApiResponse<T>> {
    const startTime = Date.now();
    const formData = this.createFormData(params);

    // Remove senha do log
    const logParams = { ...params };
    
    try {
      logger.apiRequest(endpoint, 'POST');

      const response = await this.client.post(endpoint, formData, {
        headers: formData.getHeaders(),
      });

      const duration = Date.now() - startTime;
      
      await this.logRequest(
        endpoint,
        logParams,
        response.data,
        response.status,
        duration,
        true
      );

      logger.sync(`${endpoint}`, 'success', { duration: `${duration}ms` });

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;
      
      const errorMessage = axiosError.response?.data 
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      await this.logRequest(
        endpoint,
        logParams,
        axiosError.response?.data,
        axiosError.response?.status || 500,
        duration,
        false,
        errorMessage
      );

      logger.sync(`${endpoint}`, 'error', { 
        error: errorMessage, 
        duration: `${duration}ms` 
      });

      return {
        success: false,
        error: errorMessage,
        statusCode: axiosError.response?.status,
      };
    }
  }

  // ==========================================
  // CLIENTES - Documentação: /api-docs
  // ==========================================

  /**
   * Lista todos os clientes cadastrados
   * POST /clientes/listar
   */
  async listarClientes(): Promise<OleApiResponse> {
    return this.request('/clientes/listar');
  }

  /**
   * Busca cliente por CPF/CNPJ
   * POST /clientes/buscacpfcnpj/{cpf_cnpj}
   */
  async buscarClientePorCpfCnpj(cpfCnpj: string): Promise<OleApiResponse> {
    return this.request(`/clientes/buscacpfcnpj/${cpfCnpj}`);
  }

  /**
   * Busca dados completos de um cliente
   * POST /clientes/buscadados/{id_cliente}
   */
  async buscarDadosCliente(idCliente: string): Promise<OleApiResponse> {
    return this.request(`/clientes/buscadados/${idCliente}`);
  }

  /**
   * Insere um novo cliente
   * POST /clientes/inserir
   */
  async inserirCliente(data: ClienteOleData): Promise<OleApiResponse> {
    return this.request('/clientes/inserir', data);
  }

  /**
   * Altera dados de um cliente existente
   * POST /clientes/alterar/{id_cliente}
   */
  async alterarCliente(idCliente: string, data: Partial<ClienteOleData>): Promise<OleApiResponse> {
    return this.request(`/clientes/alterar/${idCliente}`, data);
  }

  // ==========================================
  // BOLETOS - Documentação: /api-docs
  // ==========================================

  /**
   * Lista todos os boletos de um cliente
   * POST /boletos/listar/{id_cliente}
   */
  async listarBoletos(idCliente: string): Promise<OleApiResponse> {
    return this.request(`/boletos/listar/${idCliente}`);
  }

  /**
   * Busca boletos por CPF/CNPJ e status
   * POST /boletos/buscacpfcnpj/{cpf_cnpj}/{status?}
   */
  async buscarBoletosPorCpfCnpj(cpfCnpj: string, status?: 'Aberto' | 'Pago'): Promise<OleApiResponse> {
    const endpoint = status 
      ? `/boletos/buscacpfcnpj/${cpfCnpj}/${status}`
      : `/boletos/buscacpfcnpj/${cpfCnpj}`;
    return this.request(endpoint);
  }

  /**
   * Busca boletos por ID do contrato
   * POST /boletos/buscacontrato/{id_contrato}
   */
  async buscarBoletosPorContrato(idContrato: string): Promise<OleApiResponse> {
    return this.request(`/boletos/buscacontrato/${idContrato}`);
  }

  /**
   * Visualiza o PDF de um boleto (retorna Base64)
   * POST /boletos/visualizar/{id_boleto}
   */
  async visualizarBoleto(idBoleto: string): Promise<OleApiResponse> {
    return this.request(`/boletos/visualizar/${idBoleto}`);
  }

  /**
   * Registra a baixa/pagamento de um boleto
   * POST /boletos/baixa/{id_boleto}
   */
  async baixarBoleto(
    idBoleto: string, 
    dataPagamento: string, 
    valorPago: string, 
    comentario?: string
  ): Promise<OleApiResponse> {
    return this.request(`/boletos/baixa/${idBoleto}`, {
      data_pagamento: dataPagamento,
      valor_pago: valorPago,
      comentario,
    });
  }

  // ==========================================
  // CONTRATOS - Documentação: /api-docs
  // ==========================================

  /**
   * Lista todos os planos disponíveis para contratação
   * POST /planos
   */
  async listarPlanos(): Promise<OleApiResponse> {
    return this.request('/planos');
  }

  /**
   * Lista todos os modelos de equipamentos disponíveis
   * POST /equipamentos
   */
  async listarEquipamentos(): Promise<OleApiResponse> {
    return this.request('/equipamentos');
  }

  /**
   * Lista todos os contratos de um cliente
   * POST /contratos/listar/{id_cliente}
   */
  async listarContratos(idCliente: string): Promise<OleApiResponse> {
    return this.request(`/contratos/listar/${idCliente}`);
  }

  /**
   * Altera o e-mail do usuário de um contrato
   * POST /contratos/alterarusuario/{id_contrato}
   */
  async alterarUsuarioContrato(idContrato: string, emailUsuario: string): Promise<OleApiResponse> {
    return this.request(`/contratos/alterarusuario/${idContrato}`, {
      email_usuario: emailUsuario,
    });
  }

  /**
   * Insere um novo contrato para um cliente
   * POST /contratos/inserir
   */
  async inserirContrato(data: {
    id_cliente: number;
    id_plano_principal: number;
    id_contrato_origem?: string;
    id_modelo?: number[];
    mac?: string[];
    id_plano_adicional?: number[];
    email_usuario?: string;
  }): Promise<OleApiResponse> {
    return this.request('/contratos/inserir', data);
  }

  /**
   * Envia documentação PDF para um contrato
   * POST /contratos/enviardocumentacao/{id_cliente}/{id_contrato}
   */
  async enviarDocumentacao(
    idCliente: string, 
    idContrato: string, 
    nome: string, 
    conteudoBase64: string
  ): Promise<OleApiResponse> {
    return this.request(`/contratos/enviardocumentacao/${idCliente}/${idContrato}`, {
      nome,
      conteudo: conteudoBase64,
    });
  }

  /**
   * Lista os bloqueios de um contrato
   * POST /contratos/listarbloqueios/{id_contrato}/{ativos}
   */
  async listarBloqueios(idContrato: string, apenasAtivos: boolean = true): Promise<OleApiResponse> {
    return this.request(`/contratos/listarbloqueios/${idContrato}/${apenasAtivos}`);
  }

  /**
   * Bloqueia um contrato
   * POST /contratos/bloqueio/{id_contrato}
   */
  async bloquearContrato(
    idContrato: string, 
    motivoSuspensao: 1 | 2, // 1 = Inadimplência, 2 = Pedido do Cliente
    dataEncerramento?: string
  ): Promise<OleApiResponse> {
    return this.request(`/contratos/bloqueio/${idContrato}`, {
      motivo_suspensao: motivoSuspensao,
      data_encerramento: dataEncerramento,
    });
  }

  /**
   * Desbloqueia um contrato
   * POST /contratos/desbloqueio/{id_contrato}/{id_bloqueio}
   */
  async desbloquearContrato(idContrato: string, idBloqueio: string): Promise<OleApiResponse> {
    return this.request(`/contratos/desbloqueio/${idContrato}/${idBloqueio}`);
  }

  /**
   * Lista os pontos registrados com status online/offline
   * POST /contratos/pontosregistrados/{id_contrato}
   */
  async listarPontosRegistrados(idContrato: string): Promise<OleApiResponse> {
    return this.request(`/contratos/pontosregistrados/${idContrato}`);
  }

  /**
   * Substitui equipamento de uma assinatura
   * POST /contratos/substituirequipamento/{id_assinatura}
   */
  async substituirEquipamento(
    idAssinatura: string, 
    idModelo: number, 
    mac: string
  ): Promise<OleApiResponse> {
    return this.request(`/contratos/substituirequipamento/${idAssinatura}`, {
      id_modelo: idModelo,
      mac,
    });
  }

  // ==========================================
  // UTILITÁRIOS
  // ==========================================

  /**
   * Testa conexão com a API (validação de credenciais)
   * Usa listarClientes como teste
   */
  async testarConexao(): Promise<OleApiResponse<{ valid: boolean }>> {
    try {
      const response = await this.listarClientes();
      return {
        success: response.success,
        data: { valid: response.success },
        statusCode: response.statusCode,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        data: { valid: false },
        error: error instanceof Error ? error.message : 'Erro ao testar conexão',
      };
    }
  }
}

export default OleApiService;
