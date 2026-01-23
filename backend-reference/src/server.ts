// Servidor HTTP
import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import prisma from './lib/prisma';

const PORT = parseInt(env.PORT);

async function main() {
  try {
    // Testar conexão com banco
    await prisma.$connect();
    logger.info('✅ Conectado ao banco de dados');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📍 Ambiente: ${env.NODE_ENV}`);
      logger.info(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook/ole`);
    });

  } catch (error: any) {
    logger.error('❌ Falha ao iniciar servidor', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
