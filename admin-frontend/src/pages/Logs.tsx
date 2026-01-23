import { useState } from 'react'
import { 
  ScrollText, 
  Search, 
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Mock logs for now - will be connected to real API
const mockLogs = [
  { id: '1', level: 'info', message: 'Sincronização iniciada', timestamp: new Date().toISOString(), source: 'sync' },
  { id: '2', level: 'success', message: 'Cliente criado com sucesso: João Silva', timestamp: new Date(Date.now() - 60000).toISOString(), source: 'webhook' },
  { id: '3', level: 'error', message: 'Falha ao conectar com API Olé TV', timestamp: new Date(Date.now() - 120000).toISOString(), source: 'api' },
  { id: '4', level: 'info', message: 'Processando fila: 5 itens pendentes', timestamp: new Date(Date.now() - 180000).toISOString(), source: 'queue' },
  { id: '5', level: 'warning', message: 'Rate limit atingido, aguardando 60s', timestamp: new Date(Date.now() - 240000).toISOString(), source: 'api' },
]

export function Logs() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string | null>(null)

  const filteredLogs = mockLogs.filter((log) => {
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
    if (filter && log.level !== filter) return false
    return true
  })

  const getLevelConfig = (level: string) => {
    const config: Record<string, { icon: typeof AlertCircle; color: string; bg: string }> = {
      error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
      warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
      info: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    }
    return config[level] || config.info
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs do Sistema</h1>
          <p className="text-muted-foreground">Acompanhe a atividade em tempo real</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['error', 'warning', 'success', 'info'].map((level) => (
                <Button
                  key={level}
                  variant={filter === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filter === level ? null : level)}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Eventos Recentes
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} eventos {filter && `(filtro: ${filter})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const config = getLevelConfig(log.level)
              const Icon = config.icon
              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    config.bg
                  )}
                >
                  <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {log.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum log encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
