// Serviço de Mapeamento de Produtos
// Gerencia a relação entre IntegrationCode (webhook) e Planos da Olé TV

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

// ==========================================
// TIPOS
// ==========================================

export interface ProductFromWebhook {
  externalId: string;
  code: string;           // IntegrationCode (ex: "TV_BOX", "MOBILE")
  name: string;
  active: boolean;
  tag?: string;
  tagId?: number;
  integratorType?: number;
  demonstration?: boolean;
}

export interface MappedPlan {
  integrationCode: string;
  olePlanoId: string;
  olePlanoNome: string | null;
  priority: number;
  isMainPlan: boolean;
}

export interface ProductMappingResult {
  mainPlan: MappedPlan | null;
  additionalPlans: MappedPlan[];
  unmappedCodes: string[];
  equipments: Array<{
    tag: string;
    tagId?: number;
    integrationCode: string;
  }>;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class ProductMappingService {
  private integrationId: string;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
  }

  /**
   * Mapeia produtos do webhook para planos da Olé TV
   * Aplica lógica de prioridade para selecionar o plano principal
   */
  async mapProducts(products: ProductFromWebhook[]): Promise<ProductMappingResult> {
    const result: ProductMappingResult = {
      mainPlan: null,
      additionalPlans: [],
      unmappedCodes: [],
      equipments: [],
    };

    if (!products || products.length === 0) {
      logger.warn('Nenhum produto recebido no webhook');
      return result;
    }

    // Filtra apenas produtos ativos e não demonstração
    const activeProducts = products.filter(p => p.active && !p.demonstration);

    if (activeProducts.length === 0) {
      logger.warn('Nenhum produto ativo encontrado');
      return result;
    }

    // Extrai códigos únicos de integração
    const integrationCodes = [...new Set(activeProducts.map(p => p.code))];

    logger.info('Mapeando produtos', { 
      totalRecebidos: products.length,
      ativos: activeProducts.length,
      codigos: integrationCodes,
    });

    // Busca mapeamentos do banco
    const mappings = await prisma.productPlanMapping.findMany({
      where: {
        integrationId: this.integrationId,
        integrationCode: { in: integrationCodes },
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    // Separa planos principais e adicionais
    const mainPlanMappings = mappings.filter(m => m.isMainPlan);
    const additionalMappings = mappings.filter(m => !m.isMainPlan);

    // Seleciona o plano principal de maior prioridade
    if (mainPlanMappings.length > 0) {
      const highest = mainPlanMappings[0];
      result.mainPlan = {
        integrationCode: highest.integrationCode,
        olePlanoId: highest.olePlanoId,
        olePlanoNome: highest.olePlanoNome,
        priority: highest.priority,
        isMainPlan: true,
      };

      logger.info('Plano principal selecionado', {
        code: highest.integrationCode,
        planoId: highest.olePlanoId,
        prioridade: highest.priority,
      });
    }

    // Adiciona planos adicionais
    result.additionalPlans = additionalMappings.map(m => ({
      integrationCode: m.integrationCode,
      olePlanoId: m.olePlanoId,
      olePlanoNome: m.olePlanoNome,
      priority: m.priority,
      isMainPlan: false,
    }));

    // Identifica códigos não mapeados
    const mappedCodes = mappings.map(m => m.integrationCode);
    result.unmappedCodes = integrationCodes.filter(c => !mappedCodes.includes(c));

    if (result.unmappedCodes.length > 0) {
      logger.warn('Códigos de integração não mapeados', { 
        codes: result.unmappedCodes 
      });
    }

    // Extrai equipamentos (tags) dos produtos
    result.equipments = activeProducts
      .filter(p => p.tag)
      .map(p => ({
        tag: p.tag!,
        tagId: p.tagId,
        integrationCode: p.code,
      }));

    return result;
  }

  /**
   * Verifica se um novo produto tem prioridade maior que o atual
   * Usado para decidir se deve fazer upgrade
   */
  async shouldUpgrade(
    currentIntegrationCode: string,
    newIntegrationCode: string
  ): Promise<boolean> {
    const [current, newCode] = await Promise.all([
      prisma.productPlanMapping.findUnique({
        where: {
          integrationId_integrationCode: {
            integrationId: this.integrationId,
            integrationCode: currentIntegrationCode,
          },
        },
      }),
      prisma.productPlanMapping.findUnique({
        where: {
          integrationId_integrationCode: {
            integrationId: this.integrationId,
            integrationCode: newIntegrationCode,
          },
        },
      }),
    ]);

    if (!current || !newCode) {
      logger.warn('Mapeamento não encontrado para comparação', {
        current: currentIntegrationCode,
        new: newIntegrationCode,
      });
      return false;
    }

    const shouldUpgrade = newCode.priority > current.priority;

    logger.info('Verificação de upgrade', {
      current: { code: currentIntegrationCode, priority: current.priority },
      new: { code: newIntegrationCode, priority: newCode.priority },
      shouldUpgrade,
    });

    return shouldUpgrade;
  }

  /**
   * Busca o plano principal para um código de integração
   */
  async getPlanForCode(integrationCode: string): Promise<MappedPlan | null> {
    const mapping = await prisma.productPlanMapping.findUnique({
      where: {
        integrationId_integrationCode: {
          integrationId: this.integrationId,
          integrationCode,
        },
      },
    });

    if (!mapping) {
      return null;
    }

    return {
      integrationCode: mapping.integrationCode,
      olePlanoId: mapping.olePlanoId,
      olePlanoNome: mapping.olePlanoNome,
      priority: mapping.priority,
      isMainPlan: mapping.isMainPlan,
    };
  }

  /**
   * Lista todos os mapeamentos configurados
   */
  async listMappings(): Promise<MappedPlan[]> {
    const mappings = await prisma.productPlanMapping.findMany({
      where: {
        integrationId: this.integrationId,
        isActive: true,
      },
      orderBy: [
        { isMainPlan: 'desc' },
        { priority: 'desc' },
      ],
    });

    return mappings.map(m => ({
      integrationCode: m.integrationCode,
      olePlanoId: m.olePlanoId,
      olePlanoNome: m.olePlanoNome,
      priority: m.priority,
      isMainPlan: m.isMainPlan,
    }));
  }

  /**
   * Adiciona ou atualiza um mapeamento
   */
  async upsertMapping(data: {
    integrationCode: string;
    olePlanoId: string;
    olePlanoNome?: string;
    priority?: number;
    isMainPlan?: boolean;
    description?: string;
  }): Promise<void> {
    await prisma.productPlanMapping.upsert({
      where: {
        integrationId_integrationCode: {
          integrationId: this.integrationId,
          integrationCode: data.integrationCode,
        },
      },
      create: {
        integrationId: this.integrationId,
        integrationCode: data.integrationCode,
        olePlanoId: data.olePlanoId,
        olePlanoNome: data.olePlanoNome,
        priority: data.priority || 0,
        isMainPlan: data.isMainPlan ?? true,
        description: data.description,
      },
      update: {
        olePlanoId: data.olePlanoId,
        olePlanoNome: data.olePlanoNome,
        priority: data.priority,
        isMainPlan: data.isMainPlan,
        description: data.description,
      },
    });

    logger.info('Mapeamento atualizado', { 
      code: data.integrationCode,
      planoId: data.olePlanoId,
    });
  }

  /**
   * Remove um mapeamento (soft delete)
   */
  async disableMapping(integrationCode: string): Promise<void> {
    await prisma.productPlanMapping.update({
      where: {
        integrationId_integrationCode: {
          integrationId: this.integrationId,
          integrationCode,
        },
      },
      data: { isActive: false },
    });

    logger.info('Mapeamento desativado', { code: integrationCode });
  }
}

export default ProductMappingService;
