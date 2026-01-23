// Sistema de Logging
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

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
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

  // Log específico para requisições de API
  apiRequest(endpoint: string, method: string, statusCode?: number, duration?: number) {
    this.info(`API Request: ${method} ${endpoint}`, {
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  // Log específico para sync
  sync(action: string, status: 'start' | 'success' | 'error', context?: LogContext) {
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '🔄';
    this.info(`${emoji} Sync ${action}: ${status}`, context);
  },
};

export default logger;
