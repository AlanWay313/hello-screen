import { useEffect, useState, useCallback } from 'react'
import { 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  RotateCcw,
  Trash2,
  User,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/stat-card'
import { api, QueueStats, QueueItem } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function Queue() {
  const { toast } = useToast()
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const fetchData = useCallback(async (status?: string) => {
    try {
      const [statsRes, itemsRes] = await Promise.all([
        api.getQueueStats(),
        api.getQueueItems(status || undefined),
      ])
      setStats(statsRes.data)
      setItems(itemsRes.data.items)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(activeFilter || undefined), 10000)
    return () => clearInterval(interval)
  }, [fetchData, activeFilter])

  const handleFilter = (status: string) => {
    const newFilter = activeFilter === status ? null : status
    setActiveFilter(newFilter)
    fetchData(newFilter || undefined)
  }

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      await api.retryQueueItem(id)
      toast({ title: 'Sucesso', description: 'Item reagendado para processamento' })
      fetchData(activeFilter || undefined)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao reagendar', variant: 'destructive' })
    } finally {
      setRetryingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteQueueItem(id)
      toast({ title: 'Removido', description: 'Item removido da fila' })
      fetchData(activeFilter || undefined)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao remover', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Pendente' },
      PROCESSING: { className: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Processando' },
      SUCCESS: { className: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Sucesso' },
      FAILED: { className: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Falhou' },
    }
    const { className, label } = config[status] || { className: '', label: status }
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  const formatAction = (action: string) => {
    const map: Record<string, { label: string; icon: typeof User }> = {
      CREATE_CLIENT: { label: 'Criar Cliente', icon: User },
      UPDATE_CLIENT: { label: 'Atualizar Cliente', icon: User },
      CREATE_CONTRACT: { label: 'Criar Contrato', icon: FileText },
      CANCEL_CONTRACT: { label: 'Cancelar Contrato', icon: FileText },
    }
    return map[action] || { label: action, icon: FileText }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fila de Sincronização</h1>
          <p className="text-muted-foreground">Monitor de processamento em tempo real</p>
        </div>
        <Button variant="outline" onClick={() => fetchData(activeFilter || undefined)} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            iconClassName="bg-blue-500/10 text-blue-600"
            onClick={() => handleFilter('PENDING')}
            className={activeFilter === 'PENDING' ? 'ring-2 ring-blue-500' : ''}
          />
          <StatCard
            title="Processando"
            value={stats.processing}
            icon={stats.processing > 0 ? Loader2 : Clock}
            iconClassName="bg-purple-500/10 text-purple-600"
            onClick={() => handleFilter('PROCESSING')}
            className={activeFilter === 'PROCESSING' ? 'ring-2 ring-purple-500' : ''}
          />
          <StatCard
            title="Sucesso"
            value={stats.success}
            icon={CheckCircle2}
            iconClassName="bg-green-500/10 text-green-600"
            onClick={() => handleFilter('SUCCESS')}
            className={activeFilter === 'SUCCESS' ? 'ring-2 ring-green-500' : ''}
          />
          <StatCard
            title="Falhas"
            value={stats.failed}
            icon={XCircle}
            iconClassName="bg-red-500/10 text-red-600"
            onClick={() => handleFilter('FAILED')}
            className={activeFilter === 'FAILED' ? 'ring-2 ring-red-500' : ''}
          />
        </div>
      )}

      {/* Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Itens na Fila</CardTitle>
              <CardDescription>
                {activeFilter ? `Filtrando por: ${activeFilter}` : 'Mostrando todos os itens'}
              </CardDescription>
            </div>
            {activeFilter && (
              <Button variant="ghost" size="sm" onClick={() => handleFilter(activeFilter)}>
                Limpar filtro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum item na fila</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const actionInfo = formatAction(item.action)
                const ActionIcon = actionInfo.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <ActionIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{actionInfo.label}</p>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.payload.clientName || item.payload.document || 'N/A'}
                          <span className="mx-2">•</span>
                          Tentativa {item.attempts}/{item.maxAttempts}
                        </p>
                        {item.lastError && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-md">
                            {item.lastError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                        >
                          {retryingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {item.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
