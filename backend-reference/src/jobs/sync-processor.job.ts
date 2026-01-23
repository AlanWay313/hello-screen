// Job de Processamento da Fila de Sincronização
// Pode ser executado via cron ou worker separado

import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { SyncQueueService } from '../services/sync-queue.service';

const BATCH_SIZE = 10;
const INTERVAL_MS = 30000; // 30 segundos

/**
 * Processa todas as integrações ativas
 */
async function processAllIntegrations() {
  logger.info('🔄 Iniciando processamento de filas...');

  try {
    // Busca todas as integrações ativas
    const integrations = await prisma.integration.findMany({
      where: { isActive: true },
      select: { id: true, userId: true },
    });

    logger.info(`Encontradas ${integrations.length} integrações ativas`);

    let totalProcessed = 0;
    let totalFailed = 0;

    // Processa cada integração
    for (const integration of integrations) {
      try {
        const syncQueue = new SyncQueueService(integration.id);
        const result = await syncQueue.processQueue(BATCH_SIZE);
        
        totalProcessed += result.processed;
        totalFailed += result.failed;

      } catch (error: any) {
        logger.error(`Erro ao processar integração ${integration.id}`, { 
          error: error.message 
        });
      }
    }

    logger.info('✅ Processamento concluído', { 
      totalProcessed, 
      totalFailed 
    });

  } catch (error: any) {
    logger.error('Erro no job de sincronização', { error: error.message });
  }
}

/**
 * Inicia o job em modo contínuo
 */
async function startContinuousMode() {
  logger.info('🚀 Job de sincronização iniciado em modo contínuo');
  
  // Conectar ao banco
  await prisma.$connect();
  
  // Loop infinito
  while (true) {
    await processAllIntegrations();
    
    // Aguarda intervalo
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
}

/**
 * Executa uma única vez (para cron)
 */
async function runOnce() {
  logger.info('🚀 Job de sincronização (execução única)');
  
  await prisma.$connect();
  await processAllIntegrations();
  await prisma.$disconnect();
  
  process.exit(0);
}

// Modo de execução baseado em argumento
const mode = process.argv[2];

if (mode === 'continuous') {
  startContinuousMode();
} else {
  runOnce();
}
