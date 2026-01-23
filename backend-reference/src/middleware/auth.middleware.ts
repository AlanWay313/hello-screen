// Middleware de Autenticação
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface JwtPayload {
  userId: string;
  email?: string;
  iat: number;
  exp: number;
}

/**
 * Middleware para validar JWT
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
    logger.warn('Falha na autenticação', { error: error.message });

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
    { expiresIn: '7d' } // Token válido por 7 dias
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

  // Se tiver header, valida normalmente
  return authMiddleware(req, res, next);
}
