// Aplicação Express Principal
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { logger } from './lib/logger';

// Rotas
import webhookRoutes from './routes/webhook.routes';
import syncRoutes from './routes/sync.routes';
import integrationRoutes from './routes/integration.routes';
import syncFromOleRoutes from './routes/sync-from-ole.routes';

// Criar aplicação
const app = express();

// ==========================================
// MIDDLEWARES GLOBAIS
// ==========================================

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: env.NODE_ENV === 'production' 
    ? ['https://seu-frontend.com'] // Altere para seu domínio
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compressão
app.use(compression());

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por janela
  message: { error: 'Muitas requisições, tente novamente mais tarde' },
});
app.use('/api/', limiter);

// Logging de requisições
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiRequest(req.path, req.method, res.statusCode, duration);
  });
  
  next();
});

// ==========================================
// ROTAS
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/sync-from-ole', syncFromOleRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    path: req.path,
  });
});

// Error handler global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erro não tratado', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
