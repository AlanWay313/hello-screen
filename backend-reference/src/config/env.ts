// Configurações de Ambiente
// Crie um arquivo .env na raiz com essas variáveis

import { z } from 'zod';

const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().url(),
  
  // Servidor
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // JWT para autenticação dos webhooks
  JWT_SECRET: z.string().min(32),
  
  // API Olé TV (padrões)
  OLE_API_BASE_URL: z.string().url().default('https://api.ofrfrbo.site/cliente'),
  OLE_API_TIMEOUT: z.string().default('30000'),
  
  // API Externa (para dados complementares)
  EXTERNAL_API_URL: z.string().url().optional(),
  EXTERNAL_API_CLIENT_ID: z.string().optional(),
  EXTERNAL_API_CLIENT_SECRET: z.string().optional(),
  
  // Criptografia
  ENCRYPTION_KEY: z.string().min(32), // Para criptografar senhas da Olé
  
  // Redis (opcional, para filas)
  REDIS_URL: z.string().url().optional(),
});

// Validar variáveis de ambiente
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

// Exemplo de arquivo .env
export const envExample = `
# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/ole_integration?schema=public"

# Servidor
PORT=3000
NODE_ENV=development

# JWT Secret (mínimo 32 caracteres)
JWT_SECRET="sua-chave-secreta-muito-longa-aqui-32chars"

# API Olé TV
OLE_API_BASE_URL="https://api.ofrfrbo.site/cliente"
OLE_API_TIMEOUT=30000

# API Externa (dados complementares)
EXTERNAL_API_URL="https://erp-staging.internetway.com.br:45700"
EXTERNAL_API_CLIENT_ID="42be0567-faaa-44a6-886b-f12142b72ffd"
EXTERNAL_API_CLIENT_SECRET="d44d3d6a-39b8-4e27-bbaf-1b45843debc4"

# Chave de Criptografia (32 caracteres)
ENCRYPTION_KEY="chave-criptografia-32-caracteres"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"
`;
