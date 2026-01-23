import { useEffect, useState } from 'react'
import { 
  RefreshCw, 
  Users, 
  FileText, 
  Receipt, 
  CheckCircle2, 
  XCircle,
  Play,
  Loader2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api, SyncStatsResponse, SyncResultResponse } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type SyncStep = 'idle' | 'clientes' | 'contratos' | 'boletos' | 'done' | 'error'

export function Sync() {
  const { toast } = useToast()
  const [stats, setStats] = useState<SyncStatsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<SyncStep>('idle')
  const [result, setResult] = useState<SyncResultResponse['data'] | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)

  const fetchStats = async () => {
    const token = localStorage.getItem('admin_auth_token')
    if (!token) {
      setNotConfigured(true)
      setLoading(false)
      return
    }

    try {
      const res = await api.getSyncStats()
      setStats(res.data)
      setNotConfigured(false)
    } catch (error) {
      console.error('Erro ao buscar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setProgress(0)
    setCurrentStep('clientes')
    setResult(null)

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 95))
    }, 400)

    setTimeout(() => setCurrentStep('contratos'), 2500)
    setTimeout(() => setCurrentStep('boletos'), 5000)

    try {
      const res = await api.runFullSync()
      clearInterval(progressInterval)
      setProgress(100)
      setCurrentStep('done')
      setResult(res.data)
      await fetchStats()
      
      toast({
        title: res.data.success ? 'Sincronização concluída!' : 'Sincronização com erros',
        description: `${res.data.totalSynced} registros em ${(res.data.duration / 1000).toFixed(1)}s`,
        variant: res.data.success ? 'default' : 'destructive',
      })
    } catch (err) {
      clearInterval(progressInterval)
      setCurrentStep('error')
      setProgress(0)
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Falha na sincronização',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const getStepStatus = (step: SyncStep) => {
    const order: SyncStep[] = ['clientes', 'contratos', 'boletos']
    const currentIdx = order.indexOf(currentStep)
    const stepIdx = order.indexOf(step)
    
    if (currentStep === 'done') return 'done'
    if (currentStep === 'error') return 'error'
    if (stepIdx < currentIdx) return 'done'
    if (stepIdx === currentIdx) return 'active'
    return 'pending'
  }

  const StepCard = ({ step, label, icon: Icon }: { step: SyncStep; label: string; icon: typeof Users }) => {
    const status = getStepStatus(step)
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all",
        status === 'active' && "bg-primary/5 border-primary/30",
        status === 'done' && "bg-green-500/5 border-green-500/30",
        status === 'error' && "bg-destructive/5 border-destructive/30",
        status === 'pending' && "bg-muted/30"
      )}>
        <div className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center",
          status === 'active' && "bg-primary/10",
          status === 'done' && "bg-green-500/10",
          status === 'error' && "bg-destructive/10",
          status === 'pending' && "bg-muted"
        )}>
          {status === 'active' ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : status === 'done' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : status === 'error' ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className={cn(
            "font-medium",
            status === 'active' && "text-primary",
            status === 'done' && "text-green-600",
            status === 'error' && "text-destructive",
            status === 'pending' && "text-muted-foreground"
          )}>
            {label}
          </p>
          {result && status === 'done' && (
            <p className="text-xs text-muted-foreground">
              {step === 'clientes' && `${result.results.clientes.synced} sincronizados`}
              {step === 'contratos' && `${result.results.contratos.synced} sincronizados`}
              {step === 'boletos' && `${result.results.boletos.synced} sincronizados`}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (notConfigured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sincronização</h1>
          <p className="text-muted-foreground">Importar dados da API Olé TV para o banco local</p>
        </div>
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-700">Configure a integração primeiro para sincronizar dados.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sincronização</h1>
        <p className="text-muted-foreground">Importar dados da API Olé TV para o banco local</p>
      </div>

      {/* Current Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Banco de Dados Local
              </CardTitle>
              <CardDescription>Dados atualmente sincronizados</CardDescription>
            </div>
            {stats?.lastSync && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {new Date(stats.lastSync).toLocaleString('pt-BR')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.clientes}</p>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contratos}</p>
                  <p className="text-sm text-muted-foreground">Contratos</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.boletos}</p>
                  <p className="text-sm text-muted-foreground">Boletos</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700">Erro ao carregar estatísticas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Action */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização Manual</CardTitle>
          <CardDescription>Importa todos os dados da Olé TV para o banco local</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          {syncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Steps */}
          {(syncing || result) && (
            <div className="grid gap-3 md:grid-cols-3">
              <StepCard step="clientes" label="Clientes" icon={Users} />
              <StepCard step="contratos" label="Contratos" icon={FileText} />
              <StepCard step="boletos" label="Boletos" icon={Receipt} />
            </div>
          )}

          {/* Result */}
          {result && currentStep === 'done' && (
            <div className={cn(
              "p-4 rounded-lg",
              result.success ? "bg-green-500/10 border border-green-500/20" : "bg-amber-500/10 border border-amber-500/20"
            )}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className={cn("font-medium", result.success ? "text-green-700" : "text-amber-700")}>
                    {result.success ? 'Sincronização concluída!' : 'Concluída com erros'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.totalSynced} sincronizados
                    {result.totalFailed > 0 && ` • ${result.totalFailed} falhas`}
                    {' • '}{(result.duration / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSync} disabled={syncing} size="lg" className="w-full">
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Iniciar Sincronização
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
