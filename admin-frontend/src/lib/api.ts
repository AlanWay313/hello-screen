const API_BASE = '/api'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('admin_auth_token')
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro de conexão' }))
    throw new Error(error.error || `Erro ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Queue
  getQueueStats: () => apiRequest<{ data: QueueStats }>('/queue/stats'),
  getQueueItems: (status?: string) => 
    apiRequest<{ data: { items: QueueItem[] } }>(`/queue/items${status ? `?status=${status}` : ''}`),
  retryQueueItem: (id: string) => 
    apiRequest<{ success: boolean }>(`/queue/retry/${id}`, { method: 'POST' }),
  deleteQueueItem: (id: string) => 
    apiRequest<{ success: boolean }>(`/queue/${id}`, { method: 'DELETE' }),

  // Sync
  getSyncStats: () => apiRequest<{ data: SyncStats }>('/sync-from-ole/stats'),
  runFullSync: () => apiRequest<{ data: SyncResult }>('/sync-from-ole/full', { method: 'POST' }),

  // Integration
  setupIntegration: (data: IntegrationSetup) => 
    apiRequest<SetupResponse>('/integration/setup', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  getIntegrationStatus: () => apiRequest<{ data: IntegrationStatus }>('/integration/status'),
  regenerateToken: () => 
    apiRequest<{ webhookToken: string }>('/integration/regenerate-token', { method: 'POST' }),
}

// Types
export interface QueueStats {
  pending: number
  processing: number
  success: number
  failed: number
  total: number
  recentActivity: {
    lastProcessed: string | null
    lastSuccess: string | null
    lastFailed: string | null
  }
}

export interface QueueItem {
  id: string
  action: string
  status: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  createdAt: string
  updatedAt: string
  payload: {
    clientName?: string
    document?: string
  }
}

export interface SyncStats {
  clientes: number
  contratos: number
  boletos: number
  lastSync: string | null
}

export interface SyncResult {
  success: boolean
  totalSynced: number
  totalFailed: number
  duration: number
  results: {
    clientes: { synced: number; failed: number; errors: string[] }
    contratos: { synced: number; failed: number; errors: string[] }
    boletos: { synced: number; failed: number; errors: string[] }
  }
}

export interface IntegrationSetup {
  oleKeyapi: string
  oleLogin: string
  olePassword: string
}

export interface SetupResponse {
  success: boolean
  integration: { id: string; webhookToken: string }
  webhookUrl: string
  webhookHeaders: { Username: string; Password: string; Token: string }
  authToken: string
}

export interface IntegrationStatus {
  configured: boolean
  isActive: boolean
  webhookUrl: string
  lastActivity: string | null
}
