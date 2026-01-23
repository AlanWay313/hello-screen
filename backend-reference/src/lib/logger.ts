// Sistema de Logging Avançado
// Logs detalhados para sincronização e operações da API
import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = env.NODE_ENV === 'production' ? 'info' : 'debug';

// Cores para console (ANSI)
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function getColorByLevel(level: LogLevel): string {
  switch (level) {
    case 'debug': return COLORS.gray;
    case 'info': return COLORS.blue;
    case 'warn': return COLORS.yellow;
    case 'error': return COLORS.red;
    default: return COLORS.white;
  }
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const color = getColorByLevel(level);
  const contextStr = context ? `\n   ${COLORS.dim}${JSON.stringify(context, null, 2)}${COLORS.reset}` : '';
  return `${COLORS.gray}[${timestamp}]${COLORS.reset} ${color}[${level.toUpperCase()}]${COLORS.reset} ${message}${contextStr}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, context?: LogContext) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context));
    }
  },

  // ==========================================
  // LOGS ESPECÍFICOS DE API
  // ==========================================

  apiRequest(endpoint: string, method: string, statusCode?: number, duration?: number) {
    const status = statusCode && statusCode >= 400 ? '❌' : '✅';
    this.info(`${status} API ${method} ${endpoint}`, {
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  // ==========================================
  // LOGS ESPECÍFICOS DE SINCRONIZAÇÃO
  // ==========================================

  syncStart(entity: string, total?: number) {
    console.log(`\n${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}🔄 INICIANDO SINCRONIZAÇÃO: ${entity.toUpperCase()}${COLORS.reset}`);
    if (total !== undefined) {
      console.log(`${COLORS.dim}   Total a processar: ${total} registros${COLORS.reset}`);
    }
    console.log(`${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}\n`);
  },

  syncProgress(entity: string, current: number, total: number, item?: string) {
    const percent = Math.round((current / total) * 100);
    const bar = this.progressBar(percent);
    const itemStr = item ? ` → ${item.substring(0, 30)}...` : '';
    process.stdout.write(`\r   ${bar} ${current}/${total} (${percent}%)${itemStr}          `);
  },

  syncBatch(batchNumber: number, totalBatches: number, batchSize: number) {
    console.log(`\n${COLORS.magenta}📦 Lote ${batchNumber}/${totalBatches} (${batchSize} itens)${COLORS.reset}`);
  },

  syncComplete(entity: string, synced: number, failed: number, duration: number) {
    console.log(`\n`);
    console.log(`${COLORS.green}${'─'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.green}✅ SINCRONIZAÇÃO COMPLETA: ${entity.toUpperCase()}${COLORS.reset}`);
    console.log(`${COLORS.dim}   ✓ Sincronizados: ${synced}${COLORS.reset}`);
    if (failed > 0) {
      console.log(`${COLORS.red}   ✗ Falhas: ${failed}${COLORS.reset}`);
    }
    console.log(`${COLORS.dim}   ⏱ Duração: ${this.formatDuration(duration)}${COLORS.reset}`);
    console.log(`${COLORS.green}${'─'.repeat(60)}${COLORS.reset}\n`);
  },

  syncError(entity: string, error: string, context?: LogContext) {
    console.log(`\n${COLORS.red}${'─'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.red}❌ ERRO NA SINCRONIZAÇÃO: ${entity.toUpperCase()}${COLORS.reset}`);
    console.log(`${COLORS.red}   ${error}${COLORS.reset}`);
    if (context) {
      console.log(`${COLORS.dim}   ${JSON.stringify(context)}${COLORS.reset}`);
    }
    console.log(`${COLORS.red}${'─'.repeat(60)}${COLORS.reset}\n`);
  },

  syncRetry(entity: string, attempt: number, maxAttempts: number, delay: number) {
    console.log(`${COLORS.yellow}   ⏳ Tentativa ${attempt}/${maxAttempts} - Aguardando ${delay}ms (rate limit)...${COLORS.reset}`);
  },

  syncSkip(entity: string, reason: string) {
    console.log(`${COLORS.gray}   ⊘ ${entity}: ${reason}${COLORS.reset}`);
  },

  // ==========================================
  // LOGS DE CLIENTE ESPECÍFICO
  // ==========================================

  clientSync(clienteId: string, clienteNome: string, action: string) {
    console.log(`${COLORS.dim}   → Cliente ${clienteId}: ${clienteNome} - ${action}${COLORS.reset}`);
  },

  clientDetail(label: string, value: string | number) {
    console.log(`${COLORS.dim}      ${label}: ${value}${COLORS.reset}`);
  },

  // ==========================================
  // LOGS DO FLUXO COMPLETO
  // ==========================================

  fullSyncStart() {
    console.log(`\n${COLORS.bright}${COLORS.cyan}${'╔'.padEnd(59, '═')}╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}║${'  🚀 SINCRONIZAÇÃO COMPLETA OLÉ TV → BANCO LOCAL  '.padEnd(58)}║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}${'╚'.padEnd(59, '═')}╝${COLORS.reset}\n`);
    console.log(`${COLORS.dim}   Iniciado em: ${new Date().toLocaleString('pt-BR')}${COLORS.reset}`);
    console.log(`${COLORS.dim}   Rate limiting: 300ms entre chamadas, lotes de 10${COLORS.reset}\n`);
  },

  fullSyncComplete(result: {
    totalSynced: number;
    totalFailed: number;
    duration: number;
    clientes: { synced: number; failed: number };
    contratos: { synced: number; failed: number };
    boletos: { synced: number; failed: number };
  }) {
    console.log(`\n${COLORS.bright}${COLORS.green}${'╔'.padEnd(59, '═')}╗${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.green}║${'  ✅ SINCRONIZAÇÃO FINALIZADA COM SUCESSO  '.padEnd(58)}║${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.green}${'╚'.padEnd(59, '═')}╝${COLORS.reset}\n`);
    
    console.log(`${COLORS.dim}   📊 RESUMO:${COLORS.reset}`);
    console.log(`${COLORS.dim}   ${'─'.repeat(40)}${COLORS.reset}`);
    console.log(`   ${COLORS.cyan}Clientes:${COLORS.reset}  ${result.clientes.synced} sync | ${result.clientes.failed} falhas`);
    console.log(`   ${COLORS.cyan}Contratos:${COLORS.reset} ${result.contratos.synced} sync | ${result.contratos.failed} falhas`);
    console.log(`   ${COLORS.cyan}Boletos:${COLORS.reset}   ${result.boletos.synced} sync | ${result.boletos.failed} falhas`);
    console.log(`${COLORS.dim}   ${'─'.repeat(40)}${COLORS.reset}`);
    console.log(`   ${COLORS.green}TOTAL:${COLORS.reset}     ${result.totalSynced} registros`);
    console.log(`   ${COLORS.dim}Duração:${COLORS.reset}   ${this.formatDuration(result.duration)}`);
    console.log(`   ${COLORS.dim}Finalizado: ${new Date().toLocaleString('pt-BR')}${COLORS.reset}\n`);
  },

  // ==========================================
  // UTILITÁRIOS
  // ==========================================

  progressBar(percent: number): string {
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    return `${COLORS.green}[${'█'.repeat(filled)}${COLORS.gray}${'░'.repeat(empty)}${COLORS.green}]${COLORS.reset}`;
  },

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  },

  divider(char: string = '─', length: number = 60) {
    console.log(`${COLORS.dim}${char.repeat(length)}${COLORS.reset}`);
  },

  // Log legado para compatibilidade
  sync(action: string, status: 'start' | 'success' | 'error', context?: LogContext) {
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    this.info(`${emoji} Sync ${action}: ${status}`, context);
  },
};

export default logger;
