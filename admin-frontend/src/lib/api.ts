const API_BASE = '/api'

// Wrapper para chamadas com suporte a método get/post (usado pelo AuthContext)
export const adminApi = {
  get: async <T = { success: boolean }>(endpoint: string): Promise<{ data: T }> => {
    const response = await apiRequest<T>(endpoint)
    return { data: response }
  },
  post: async <T = { success: boolean }>(endpoint: string, data?: unknown): Promise<{ data: T }> => {
    const response = await apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
    return { data: response }
  },
}

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
  // Queue - Endpoints reais do backend
  getQueueStats: () => apiRequest<QueueStatsResponse>('/queue/stats'),
  getQueueItems: (status?: string) => {
    const params = new URLSearchParams({ limit: '20' })
    if (status) params.append('status', status)
    return apiRequest<QueueItemsResponse>(`/queue/items?${params}`)
  },
  retryQueueItem: (id: string) => 
    apiRequest<{ success: boolean }>(`/queue/retry/${id}`, { method: 'POST' }),
  deleteQueueItem: (id: string) => 
    apiRequest<{ success: boolean }>(`/queue/${id}`, { method: 'DELETE' }),

  // Sync From Olé - Endpoints reais do backend
  getSyncStats: () => apiRequest<SyncStatsResponse>('/sync-from-ole/stats'),
  runFullSync: () => apiRequest<SyncResultResponse>('/sync-from-ole/full', { method: 'POST' }),

  // Integration - Endpoints reais do backend
  setupIntegration: (data: IntegrationSetup) => 
    apiRequest<SetupResponse>('/integration/setup', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  getIntegrationStatus: () => apiRequest<IntegrationStatusResponse>('/integration/status'),
  regenerateToken: () => 
    apiRequest<RegenerateTokenResponse>('/integration/regenerate-token', { method: 'POST' }),
}

// ==========================================
// TIPOS - Baseados nas respostas reais do backend
// ==========================================

// Queue Stats
export interface QueueStatsResponse {
  success: boolean
  data: {
    queue: {
      pending: number
      processing: number
      success: number
      failed: number
      total: number
    }
    recentByAction: Array<{ action: string; count: number }>
    lastUpdate: string
  }
}

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

// Queue Items
export interface QueueItemsResponse {
  success: boolean
  data: {
    items: QueueItem[]
    pagination: {
      total: number
      limit: number
      offset: number
    }
  }
}

export interface QueueItem {
  id: string
  action: string
  status: string
  priority: number
  attempts: number
  maxAttempts: number
  lastError: string | null
  scheduledFor: string | null
  processedAt: string | null
  createdAt: string
  payload: any
  documento?: string
  nome?: string
  localClientId?: string
}

// Sync Stats
export interface SyncStatsResponse {
  success: boolean
  data: {
    clientes: number
    contratos: number
    boletos: number
    lastSync: string | null
  }
}

export interface SyncStats {
  clientes: number
  contratos: number
  boletos: number
  lastSync: string | null
}

// Sync Result
export interface SyncResultResponse {
  success: boolean
  message: string
  data: {
    success: boolean
    startedAt: string
    completedAt: string
    duration: number
    totalSynced: number
    totalFailed: number
    results: {
      clientes: EntitySyncResult
      contratos: EntitySyncResult
      boletos: EntitySyncResult
    }
  }
}

export interface EntitySyncResult {
  synced: number
  failed: number
  errors: string[]
  duration: number
}

export interface SyncResult {
  success: boolean
  totalSynced: number
  totalFailed: number
  duration: number
  results: {
    clientes: EntitySyncResult
    contratos: EntitySyncResult
    boletos: EntitySyncResult
  }
}

// Integration Setup
export interface IntegrationSetup {
  oleKeyapi: string
  oleLogin: string
  olePassword: string
}

export interface SetupResponse {
  success: boolean
  message: string
  data: {
    integrationId: string
    userId: string
    webhookToken: string
    authToken: string
    webhookUrl: string
    instructions: {
      webhook: {
        url: string
        method: string
        headers: {
          'Content-Type': string
          Username: string
          Password: string
          Token: string
        }
      }
      api: {
        authorization: string
        note: string
      }
    }
    isNew: boolean
  }
}

// Integration Status
export interface IntegrationStatusResponse {
  success: boolean
  data: {
    integrationId: string
    isActive: boolean
    oleLogin: string
    lastSync: string | null
    createdAt: string
    stats: {
      clientesNoCache: number
      itensNaFila: number
      logsRegistrados: number
      fila: {
        pending: number
        processing: number
        success: number
        failed: number
      }
    }
    webhook: {
      url: string
      tokenConfigured: boolean
    }
  }
}

// Regenerate Token
export interface RegenerateTokenResponse {
  success: boolean
  message: string
  data: {
    webhookToken: string
    webhookUrl: string
    note: string
  }
}
