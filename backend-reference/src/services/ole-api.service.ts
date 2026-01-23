// Serviço de Integração com API Olé TV
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
  documento: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
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
      baseURL: env.OLE_API_BASE_URL,
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
      password: decrypt(integration.olePassword), // Descriptografa a senha
    };

    return new OleApiService(integrationId, credentials);
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  private createFormData(params: Record<string, any>): FormData {
    const formData = new FormData();
    
    // Adiciona credenciais
    formData.append('keyapi', this.credentials.keyapi);
    formData.append('login', this.credentials.login);
    formData.append('pass', this.credentials.password);
    
    // Adiciona parâmetros
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
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
    params: Record<string, any>
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
  // CLIENTES
  // ==========================================

  /**
   * Busca cliente por documento (CPF/CNPJ)
   */
  async buscarCliente(documento: string): Promise<OleApiResponse> {
    return this.request('/buscar-cliente.php', { documento });
  }

  /**
   * Busca cliente por ID interno da Olé
   */
  async buscarClientePorId(idCliente: string): Promise<OleApiResponse> {
    return this.request('/buscar-cliente.php', { idCliente });
  }

  /**
   * Cadastra novo cliente
   */
  async cadastrarCliente(data: ClienteOleData): Promise<OleApiResponse> {
    return this.request('/cadastrar-cliente.php', data);
  }

  /**
   * Edita cliente existente
   */
  async editarCliente(idCliente: string, data: Partial<ClienteOleData>): Promise<OleApiResponse> {
    return this.request('/editar-cliente.php', { idCliente, ...data });
  }

  // ==========================================
  // CONTRATOS
  // ==========================================

  /**
   * Busca contratos de um cliente
   */
  async buscarContratos(idCliente: string): Promise<OleApiResponse> {
    return this.request('/buscar-contratos.php', { idCliente });
  }

  /**
   * Cadastra novo contrato
   */
  async cadastrarContrato(idCliente: string, data: Record<string, any>): Promise<OleApiResponse> {
    return this.request('/cadastrar-contrato.php', { idCliente, ...data });
  }

  /**
   * Cancela contrato
   */
  async cancelarContrato(idContrato: string, motivo?: string): Promise<OleApiResponse> {
    return this.request('/cancelar-contrato.php', { idContrato, motivo });
  }

  /**
   * Reativa contrato cancelado
   */
  async reativarContrato(idContrato: string): Promise<OleApiResponse> {
    return this.request('/reativar-contrato.php', { idContrato });
  }

  // ==========================================
  // PRODUTOS
  // ==========================================

  /**
   * Lista produtos disponíveis
   */
  async listarProdutos(): Promise<OleApiResponse> {
    return this.request('/listar-produtos.php', {});
  }

  /**
   * Adiciona produto ao contrato
   */
  async adicionarProduto(idContrato: string, idProduto: string, quantidade: number = 1): Promise<OleApiResponse> {
    return this.request('/adicionar-produto.php', { idContrato, idProduto, quantidade });
  }

  /**
   * Remove produto do contrato
   */
  async removerProduto(idContrato: string, idProduto: string): Promise<OleApiResponse> {
    return this.request('/remover-produto.php', { idContrato, idProduto });
  }

  // ==========================================
  // PONTOS E DISPOSITIVOS
  // ==========================================

  /**
   * Busca pontos registrados
   */
  async buscarPontosRegistrados(idCliente: string): Promise<OleApiResponse> {
    return this.request('/buscarPontosRegistrados.php', { idCliente });
  }

  /**
   * Busca bloqueios do contrato
   */
  async buscarBloqueiosContrato(idContrato: string): Promise<OleApiResponse> {
    return this.request('/buscarBloqueiosContrato.php', { idContrato });
  }

  // ==========================================
  // LISTAGEM COMPLETA (PARA SINCRONIZAÇÃO)
  // ==========================================

  /**
   * Lista todos os clientes (para sync completo)
   */
  async listarTodosClientes(): Promise<OleApiResponse> {
    return this.request('/listarTodosClientes.php', {});
  }

  /**
   * Lista todos os boletos de um cliente por documento
   */
  async listarBoletos(documento: string): Promise<OleApiResponse> {
    return this.request('/listarBoletos.php', { documento });
  }

  /**
   * Lista todos os boletos por status
   */
  async listarBoletosPorStatus(status: 'pendente' | 'pago' | 'vencido'): Promise<OleApiResponse> {
    return this.request('/listarBoletos.php', { status });
  }

  /**
   * Testa conexão com a API (validação de credenciais)
   */
  async testarConexao(): Promise<OleApiResponse<{ valid: boolean }>> {
    try {
      const response = await this.listarTodosClientes();
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
