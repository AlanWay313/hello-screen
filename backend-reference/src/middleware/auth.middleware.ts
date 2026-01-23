// Middleware de Autenticação
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import prisma from '../lib/prisma';

interface JwtPayload {
  userId: string;
  email?: string;
  iat: number;
  exp: number;
}

// ==========================================
// AUTENTICAÇÃO VIA HEADERS (WEBHOOK EXTERNO)
// ==========================================

/**
 * Middleware para autenticar webhook via headers Username/Password/Token
 * 
 * Headers esperados:
 * - Username: login do sistema externo
 * - Password: senha do sistema externo  
 * - Token: token de autenticação adicional
 */
export async function webhookAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const username = req.headers['username'] as string;
    const password = req.headers['password'] as string;
    const token = req.headers['token'] as string;

    // Validar presença dos headers obrigatórios
    if (!username || !password || !token) {
      logger.warn('Headers de autenticação ausentes', {
        hasUsername: !!username,
        hasPassword: !!password,
        hasToken: !!token,
      });

      return res.status(401).json({
        success: false,
        error: 'Headers de autenticação obrigatórios: Username, Password, Token',
      });
    }

    // Buscar integração pelo token (webhookSecret)
    const integration = await prisma.integration.findFirst({
      where: {
        webhookSecret: token,
        isActive: true,
      },
    });

    if (!integration) {
      logger.warn('Token de webhook inválido ou integração inativa');
      return res.status(401).json({
        success: false,
        error: 'Token de webhook inválido',
      });
    }

    // Verificar credenciais (opcional - pode validar contra API externa)
    // Por ora, apenas logamos para auditoria
    logger.info('Webhook autenticado', {
      integrationId: integration.id,
      username,
    });

    // Adicionar dados ao request
    (req as any).integrationId = integration.id;
    (req as any).webhookCredentials = { username, password, token };

    next();

  } catch (error: any) {
    logger.error('Erro na autenticação do webhook', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno na autenticação',
    });
  }
}

// ==========================================
// AUTENTICAÇÃO VIA JWT (ROTAS INTERNAS)
// ==========================================

/**
 * Middleware para validar JWT (rotas internas/admin)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verificar e decodificar token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Adicionar userId ao request
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;

    next();

  } catch (error: any) {
    logger.warn('Falha na autenticação JWT', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Falha na autenticação',
    });
  }
}

/**
 * Gera um token JWT para um usuário
 */
export function generateToken(userId: string, email?: string): string {
  return jwt.sign(
    { userId, email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Middleware opcional - permite requisições sem auth
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  return authMiddleware(req, res, next);
}
