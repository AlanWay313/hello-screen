// Serviço de API Externa (Dados Complementares)
// Exemplo: API do ERP para buscar dados completos do cliente

import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

// ==========================================
// TIPOS
// ==========================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface ClienteExternoData {
  id: string;
  documento: string;
  nome: string;
  email: string;
  telefone: string;
  celular?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  dataNascimento?: string;
  sexo?: string;
  rg?: string;
  [key: string]: any;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class ExternalApiService {
  private client: AxiosInstance;
  private integrationId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
    
    this.client = axios.create({
      baseURL: env.EXTERNAL_API_URL,
      timeout: 30000,
    });
  }

  // ==========================================
  // AUTENTICAÇÃO
  // ==========================================

  /**
   * Gera novo token de acesso
   */
  private async generateToken(): Promise<string> {
    logger.info('Gerando novo token da API externa');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'syngw',
      client_id: env.EXTERNAL_API_CLIENT_ID || '',
      client_secret: env.EXTERNAL_API_CLIENT_SECRET || '',
      syndata: 'TWpNMU9EYzVaakk1T0dSaU1USmxaalprWldFd00ySTFZV1JsTTJRMFptUT06WlhsS1ZHVlhOVWxpTTA0d1NXcHZhVnBZU25kTVdFNHdXVmRrY0dKdFkzVmhWelV3V2xoS2RWcFlVak5aV0d0MVdUSTVkRXh0U25sSmFYZHBWVE5zZFZKSFNXbFBhVXByV1cxV2RHTkVRWGROZW1ONVdETk9NRmxYWkhCaWJXTnBURU5LUlZsc1VqVmpSMVZwVDJsS2QySXpUakJhTTBwc1kzbEtPUT09OlpUaGtNak0xWWprMFl6bGlORE5tWkRnM01EbGtNalkyWXpBeE1HTTNNR1U9',
    });

    try {
      const response = await this.client.post<TokenResponse>(
        '/connect/token',
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;
      
      // Calcula expiração (com margem de 5 minutos)
      const expiresAt = new Date(Date.now() + (expires_in - 300) * 1000);
      
      // Salva no banco para reutilização
      await prisma.externalApiToken.upsert({
        where: { integrationId: this.integrationId },
        update: {
          accessToken: access_token,
          expiresAt,
        },
        create: {
          integrationId: this.integrationId,
          accessToken: access_token,
          expiresAt,
        },
      });

      this.accessToken = access_token;
      this.tokenExpiresAt = expiresAt;

      logger.info('Token gerado com sucesso', { expiresAt: expiresAt.toISOString() });

      return access_token;

    } catch (error) {
      logger.error('Falha ao gerar token', { error });
      throw new Error('Falha na autenticação com API externa');
    }
  }

  /**
   * Obtém token válido (do cache ou gera novo)
   */
  private async getToken(): Promise<string> {
    // Verifica se já tem token válido em memória
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    // Busca token do banco
    const storedToken = await prisma.externalApiToken.findUnique({
      where: { integrationId: this.integrationId },
    });

    if (storedToken && storedToken.expiresAt > new Date()) {
      this.accessToken = storedToken.accessToken;
      this.tokenExpiresAt = storedToken.expiresAt;
      return storedToken.accessToken;
    }

    // Gera novo token
    return this.generateToken();
  }

  // ==========================================
  // MÉTODOS DE CONSULTA
  // ==========================================

  /**
   * Busca dados completos do cliente por documento
   */
  async buscarCliente(documento: string): Promise<ClienteExternoData | null> {
    try {
      const token = await this.getToken();

      const response = await this.client.get<ClienteExternoData>(
        `/api/clientes/${documento}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('Cliente encontrado na API externa', { documento });
      return response.data;

    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.info('Cliente não encontrado na API externa', { documento });
        return null;
      }

      logger.error('Erro ao buscar cliente na API externa', { 
        documento, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Busca dados do cliente por ID externo
   */
  async buscarClientePorId(id: string): Promise<ClienteExternoData | null> {
    try {
      const token = await this.getToken();

      const response = await this.client.get<ClienteExternoData>(
        `/api/clientes/id/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;

    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Busca produtos/planos disponíveis para o cliente
   */
  async buscarProdutosCliente(documento: string): Promise<any[]> {
    try {
      const token = await this.getToken();

      const response = await this.client.get(
        `/api/clientes/${documento}/produtos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data || [];

    } catch (error: any) {
      logger.error('Erro ao buscar produtos do cliente', { documento, error: error.message });
      return [];
    }
  }
}

export default ExternalApiService;
