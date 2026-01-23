# SysProv Admin Panel

Painel administrativo para gerenciamento da integração SysProv ↔ Olé TV.

## Requisitos

- Node.js 18+
- Backend rodando em `http://localhost:3000`

## Instalação

```bash
cd admin-frontend
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O painel estará disponível em `http://localhost:5174`.

## Build

```bash
npm run build
```

## Funcionalidades

- **Dashboard**: Visão geral do sistema com métricas em tempo real
- **Fila**: Monitor da fila de sincronização com ações de retry/delete
- **Sincronização**: Importação manual de dados da Olé TV
- **Logs**: Visualização de eventos do sistema
- **Configurações**: Setup das credenciais da API Olé TV

## Arquitetura

```
admin-frontend/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── hooks/          # React hooks customizados
│   ├── lib/            # Utilitários e API client
│   ├── pages/          # Páginas da aplicação
│   └── App.tsx         # Componente raiz
├── index.html
└── package.json
```

## API Endpoints

O painel consome os seguintes endpoints do backend:

- `GET /api/queue/stats` - Estatísticas da fila
- `GET /api/queue/items` - Itens na fila
- `POST /api/queue/retry/:id` - Reagendar item
- `DELETE /api/queue/:id` - Remover item
- `GET /api/sync-from-ole/stats` - Estatísticas do banco local
- `POST /api/sync-from-ole/full` - Sincronização completa
- `POST /api/integration/setup` - Configurar integração
