// Serviço de Formatação e Validação de Dados para API Olé TV
// Transforma dados do webhook + API complementar para o formato exigido pela Olé

import { logger } from '../lib/logger';

// ==========================================
// TIPOS
// ==========================================

export interface DadosClienteInterno {
  documento: string;
  nome: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;      // YYYY-MM-DD
  tipoLogradouro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  codigoCidade?: number;        // Código IBGE
  referencia?: string;
  estado?: string;
  cep?: string;
  longitude?: string;
  latitude?: string;
  diaVencimento?: number;
}

export interface ClienteOleFormatado {
  nome: string;
  tipo_pessoa: 'F' | 'J';
  cpf_cnpj: string;
  dia_vencimento: number;
  endereco_cobranca: boolean;
  // Campos opcionais PF
  data_nascimento?: string;     // DD/MM/YYYY (formato Olé)
  // Campos opcionais PJ
  nome_fantasia?: string;
  // Endereço
  endereco_cep?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;     // Nome da cidade
  endereco_uf?: string;
  // Contato (arrays)
  telefone_ddd?: string[];
  telefone_numero?: string[];
  email?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  formattedData?: ClienteOleFormatado;
}

// ==========================================
// CLASSE DO SERVIÇO
// ==========================================

export class ClientFormatterService {
  
  /**
   * Valida e formata dados do cliente para inserção na Olé TV
   */
  formatForOle(dados: DadosClienteInterno): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validar documento
    const documentoLimpo = this.cleanDocument(dados.documento);
    const tipoPessoa = this.detectPersonType(documentoLimpo);
    
    if (!tipoPessoa) {
      errors.push(`Documento inválido: ${dados.documento} (deve ter 11 dígitos para CPF ou 14 para CNPJ)`);
    }

    // 2. Validar nome
    if (!dados.nome || dados.nome.trim().length < 3) {
      errors.push('Nome é obrigatório e deve ter pelo menos 3 caracteres');
    }

    // 3. Validar data de nascimento (obrigatório para PF)
    let dataNascimentoFormatada: string | undefined;
    if (tipoPessoa === 'F') {
      if (!dados.dataNascimento) {
        errors.push('Data de nascimento é obrigatória para Pessoa Física');
      } else {
        dataNascimentoFormatada = this.formatDateToOle(dados.dataNascimento);
        if (!dataNascimentoFormatada) {
          errors.push(`Data de nascimento inválida: ${dados.dataNascimento}`);
        }
      }
    }

    // 4. Validar endereço (recomendado mas não obrigatório)
    if (!dados.cep || !dados.endereco) {
      warnings.push('Endereço incompleto - recomendado preencher CEP e logradouro');
    }

    // 5. Validar telefone
    const telefoneLimpo = dados.telefone ? this.cleanPhone(dados.telefone) : null;
    if (!telefoneLimpo) {
      warnings.push('Telefone não informado ou inválido');
    }

    // Se houver erros críticos, retorna inválido
    if (errors.length > 0) {
      logger.warn('Validação falhou', { documento: dados.documento, errors });
      return { valid: false, errors, warnings };
    }

    // 6. Formatar dados
    const formatted: ClienteOleFormatado = {
      nome: dados.nome.trim().toUpperCase(),
      tipo_pessoa: tipoPessoa!,
      cpf_cnpj: this.formatDocumentForOle(documentoLimpo, tipoPessoa!),
      dia_vencimento: dados.diaVencimento || 10,
      endereco_cobranca: true,
    };

    // Data de nascimento (PF)
    if (tipoPessoa === 'F' && dataNascimentoFormatada) {
      formatted.data_nascimento = dataNascimentoFormatada;
    }

    // Nome fantasia (PJ) - usa o próprio nome se não tiver
    if (tipoPessoa === 'J') {
      formatted.nome_fantasia = dados.nome.trim().toUpperCase();
    }

    // Endereço
    if (dados.cep) {
      formatted.endereco_cep = this.cleanCep(dados.cep);
    }
    if (dados.endereco) {
      // Combina tipo de logradouro + logradouro
      const logradouro = dados.tipoLogradouro 
        ? `${dados.tipoLogradouro} ${dados.endereco}`
        : dados.endereco;
      formatted.endereco_logradouro = logradouro.trim();
    }
    if (dados.numero) {
      formatted.endereco_numero = dados.numero;
    }
    if (dados.complemento) {
      formatted.endereco_complemento = dados.complemento;
    }
    if (dados.bairro) {
      formatted.endereco_bairro = dados.bairro;
    }
    if (dados.cidade) {
      formatted.endereco_cidade = dados.cidade;
    }
    if (dados.estado) {
      formatted.endereco_uf = dados.estado.toUpperCase();
    }

    // Telefone (formato array)
    if (telefoneLimpo) {
      const { ddd, numero } = this.splitPhone(telefoneLimpo);
      formatted.telefone_ddd = [ddd];
      formatted.telefone_numero = [numero];
    }

    // Email (formato array)
    if (dados.email && this.isValidEmail(dados.email)) {
      formatted.email = [dados.email.toLowerCase().trim()];
    }

    logger.info('Dados formatados para Olé TV', {
      documento: formatted.cpf_cnpj,
      tipoPessoa: formatted.tipo_pessoa,
      temDataNascimento: !!formatted.data_nascimento,
      temEndereco: !!formatted.endereco_cep,
      temTelefone: !!formatted.telefone_numero,
    });

    return {
      valid: true,
      errors: [],
      warnings,
      formattedData: formatted,
    };
  }

  // ==========================================
  // MÉTODOS DE LIMPEZA E FORMATAÇÃO
  // ==========================================

  /**
   * Remove caracteres não numéricos do documento
   */
  private cleanDocument(doc: string): string {
    return doc.replace(/\D/g, '');
  }

  /**
   * Detecta se é CPF (11 dígitos) ou CNPJ (14 dígitos)
   */
  private detectPersonType(docLimpo: string): 'F' | 'J' | null {
    if (docLimpo.length === 11) return 'F';
    if (docLimpo.length === 14) return 'J';
    return null;
  }

  /**
   * Formata documento no padrão esperado pela Olé
   * CPF: 000.000.000-00
   * CNPJ: 00.000.000/0001-00
   */
  private formatDocumentForOle(docLimpo: string, tipo: 'F' | 'J'): string {
    if (tipo === 'F') {
      return docLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return docLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Converte data de YYYY-MM-DD para DD/MM/YYYY
   */
  private formatDateToOle(date: string): string | null {
    // Aceita formatos: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    
    const [, year, month, day] = match;
    
    // Valida se é uma data válida
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(dateObj.getTime())) return null;
    
    // Valida range razoável (1900-hoje)
    const currentYear = new Date().getFullYear();
    if (parseInt(year) < 1900 || parseInt(year) > currentYear) return null;
    
    return `${day}/${month}/${year}`;
  }

  /**
   * Limpa e valida CEP
   */
  private cleanCep(cep: string): string {
    return cep.replace(/\D/g, '').slice(0, 8);
  }

  /**
   * Limpa telefone e mantém apenas números
   */
  private cleanPhone(phone: string): string | null {
    const clean = phone.replace(/\D/g, '');
    // Telefone válido: 10 ou 11 dígitos
    if (clean.length < 10 || clean.length > 11) return null;
    return clean;
  }

  /**
   * Separa DDD do número
   */
  private splitPhone(phone: string): { ddd: string; numero: string } {
    return {
      ddd: phone.slice(0, 2),
      numero: phone.slice(2),
    };
  }

  /**
   * Valida formato de email básico
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==========================================
  // VALIDAÇÃO PRÉ-SYNC
  // ==========================================

  /**
   * Verifica se os dados mínimos estão presentes para sincronização
   */
  canSync(dados: DadosClienteInterno): { canSync: boolean; reason?: string } {
    // Documento é obrigatório
    if (!dados.documento) {
      return { canSync: false, reason: 'Documento não informado' };
    }

    const docLimpo = this.cleanDocument(dados.documento);
    const tipo = this.detectPersonType(docLimpo);

    if (!tipo) {
      return { canSync: false, reason: 'Documento inválido (CPF ou CNPJ)' };
    }

    // Nome é obrigatório
    if (!dados.nome || dados.nome.trim().length < 3) {
      return { canSync: false, reason: 'Nome não informado ou muito curto' };
    }

    // Data de nascimento é obrigatória para PF
    if (tipo === 'F' && !dados.dataNascimento) {
      return { canSync: false, reason: 'Data de nascimento obrigatória para Pessoa Física' };
    }

    return { canSync: true };
  }
}

export default ClientFormatterService;
