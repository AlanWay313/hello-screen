# 🚀 Backend Node.js + Prisma - Integração API Olé TV

Backend completo para orquestração de webhooks e sincronização com a API Olé TV.

## 📁 Estrutura do Projeto

```
backend-reference/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── config/
│   │   └── env.ts             # Configurações de ambiente
│   ├── lib/
│   │   ├── prisma.ts          # Cliente Prisma singleton
│   │   ├── encryption.ts      # Criptografia de senhas
│   │   └── logger.ts          # Sistema de logs
│   ├── services/
│   │   ├── ole-api.service.ts       # Chamadas à API Olé
│   │   ├── external-api.service.ts  # API externa (dados complementares)
│   │   ├── sync-queue.service.ts    # Gerenciamento da fila
│   │   └── orchestrator.service.ts  # Lógica de orquestração
│   ├── routes/
│   │   ├── webhook.routes.ts        # Endpoints de webhook
│   │   ├── sync.routes.ts           # Endpoints de sincronização
│   │   └── integration.routes.ts    # Config de integração
│   ├── middleware/
│   │   └── auth.middleware.ts       # Autenticação JWT
│   ├── jobs/
│   │   └── sync-processor.job.ts    # Job de processamento
│   ├── app.ts                 # Configuração Express
│   └── server.ts              # Entrada da aplicação
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# 3. Gerar cliente Prisma
npm run prisma:generate

# 4. Criar tabelas no banco
npm run prisma:migrate

# 5. Iniciar em desenvolvimento
npm run dev
```

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/ole_integration"

# Servidor
PORT=3000
NODE_ENV=development

# JWT (mínimo 32 caracteres)
JWT_SECRET="sua-chave-secreta-aqui-32-caracteres"

# Criptografia
ENCRYPTION_KEY="chave-criptografia-32-caracteres"

# API Olé
OLE_API_BASE_URL="https://api.ofrfrbo.site/cliente"

# API Externa (opcional)
EXTERNAL_API_URL="https://erp.exemplo.com"
EXTERNAL_API_CLIENT_ID="seu-client-id"
EXTERNAL_API_CLIENT_SECRET="seu-client-secret"
```

## 📡 Endpoints da API

### Webhook (recebe eventos externos)

```
POST /api/webhook/ole
Headers: Authorization: Bearer <token>
Body: {
  "action": "create" | "update" | "cancel",
  "externalId": "123",
  "documento": "12345678900",
  "nome": "João Silva",
  ...
}
```

### Integração (configuração)

```
GET    /api/integration       # Buscar config
POST   /api/integration       # Criar config
PUT    /api/integration       # Atualizar config
DELETE /api/integration       # Desativar
POST   /api/integration/test  # Testar conexão
```

### Sincronização

```
GET  /api/sync/stats          # Estatísticas da fila
GET  /api/sync/queue          # Listar itens
POST /api/sync/process        # Processar fila
POST /api/sync/retry/:id      # Reprocessar item
GET  /api/sync/logs           # Logs de sincronização
```

## 🔄 Fluxo de Orquestração

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Sistema        │     │   Este Backend  │     │   API Olé TV    │
│  Externo        │────▶│                 │────▶│                 │
│  (Webhook)      │     │  Orquestrador   │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │   API    │ │  Banco   │ │   Fila   │
              │ Externa  │ │PostgreSQL│ │   Sync   │
              └──────────┘ └──────────┘ └──────────┘
```

## 🏃 Execução do Job

```bash
# Execução única (para cron)
npm run job:sync

# Modo contínuo (worker)
npm run job:sync:continuous
```

## 📊 Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `integrations` | Credenciais da API Olé por usuário |
| `sync_queue` | Fila de sincronização com retry |
| `sync_logs` | Logs de auditoria das chamadas |
| `clients_cache` | Cache local de clientes |
| `products_cache` | Cache de produtos |
| `external_api_tokens` | Tokens da API externa |

### Visualizar dados

```bash
npm run prisma:studio
```

## 🔐 Segurança

- ✅ Senhas criptografadas (AES-256-GCM)
- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Helmet (headers de segurança)
- ✅ Validação com Zod
- ✅ CORS configurável

## 🚀 Deploy

### Railway / Render

1. Configure as variáveis de ambiente
2. Comando de build: `npm run build && npm run prisma:generate`
3. Comando de start: `npm start`

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npx prisma generate
CMD ["npm", "start"]
```

## 📝 Licença

MIT
