import { useEffect, useState } from 'react'
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/stat-card'
import { api, QueueStats, SyncStats } from '@/lib/api'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

export function Dashboard() {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [queueRes, syncRes] = await Promise.all([
        api.getQueueStats(),
        api.getSyncStats(),
      ])
      setQueueStats(queueRes.data)
      setSyncStats(syncRes.data)
      setConnectionStatus('connected')
      setLastUpdate(new Date())
    } catch {
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getHealthStatus = () => {
    if (!queueStats) return { label: 'Desconhecido', color: 'text-muted-foreground', bg: 'bg-muted' }
    
    if (queueStats.failed > 5) {
      return { label: 'Atenção', color: 'text-amber-600', bg: 'bg-amber-500/10' }
    }
    if (queueStats.processing > 0 || queueStats.pending === 0) {
      return { label: 'Saudável', color: 'text-green-600', bg: 'bg-green-500/10' }
    }
    return { label: 'Ocioso', color: 'text-muted-foreground', bg: 'bg-muted' }
  }

  const health = getHealthStatus()

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Agora'
    if (mins < 60) return `${mins}min atrás`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h atrás`
    return `${Math.floor(hours / 24)}d atrás`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de integração</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1.5 py-1.5",
              connectionStatus === 'connected' && "border-green-500/30 bg-green-500/10 text-green-600",
              connectionStatus === 'disconnected' && "border-red-500/30 bg-red-500/10 text-red-600",
              connectionStatus === 'checking' && "border-muted"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full",
              connectionStatus === 'connected' && "bg-green-500 animate-pulse",
              connectionStatus === 'disconnected' && "bg-red-500",
              connectionStatus === 'checking' && "bg-muted-foreground"
            )} />
            {connectionStatus === 'connected' && 'Conectado'}
            {connectionStatus === 'disconnected' && 'Desconectado'}
            {connectionStatus === 'checking' && 'Verificando...'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Connection Error */}
      {connectionStatus === 'disconnected' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Backend não acessível</p>
              <p className="text-sm text-muted-foreground">
                Verifique se o servidor está rodando em http://localhost:3000
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {loading && !queueStats ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))}
        </div>
      ) : queueStats && (
        <>
          {/* Queue Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Pendentes"
              value={queueStats.pending}
              icon={Clock}
              iconClassName="bg-blue-500/10 text-blue-600"
            />
            <StatCard
              title="Processando"
              value={queueStats.processing}
              icon={queueStats.processing > 0 ? Loader2 : Activity}
              iconClassName="bg-purple-500/10 text-purple-600"
            />
            <StatCard
              title="Sucesso"
              value={queueStats.success}
              icon={CheckCircle2}
              iconClassName="bg-green-500/10 text-green-600"
            />
            <StatCard
              title="Falhas"
              value={queueStats.failed}
              icon={XCircle}
              iconClassName="bg-red-500/10 text-red-600"
            />
          </div>

          {/* Health & Sync */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Health Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("p-4 rounded-lg", health.bg)}>
                  <p className={cn("font-semibold text-lg", health.color)}>
                    {health.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Último processamento: {formatTimeAgo(queueStats.recentActivity.lastProcessed)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <p className="text-muted-foreground">Último sucesso</p>
                    <p className="font-medium text-green-600">
                      {formatTimeAgo(queueStats.recentActivity.lastSuccess)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <p className="text-muted-foreground">Última falha</p>
                    <p className="font-medium text-red-600">
                      {formatTimeAgo(queueStats.recentActivity.lastFailed)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5" />
                  Dados Sincronizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {syncStats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold">{syncStats.clientes}</p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <FileText className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold">{syncStats.contratos}</p>
                      <p className="text-xs text-muted-foreground">Contratos</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <FileText className="h-6 w-6 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold">{syncStats.boletos}</p>
                      <p className="text-xs text-muted-foreground">Boletos</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum dado sincronizado ainda
                  </p>
                )}

                {syncStats?.lastSync && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Última sincronização: {new Date(syncStats.lastSync).toLocaleString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Footer */}
      {lastUpdate && (
        <p className="text-xs text-muted-foreground text-center">
          Atualizado em {lastUpdate.toLocaleTimeString('pt-BR')} • Auto-refresh a cada 30s
        </p>
      )}
    </div>
  )
}
