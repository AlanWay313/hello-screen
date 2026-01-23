import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Database, 
  Users, 
  FileText, 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Play
} from "lucide-react";

interface SyncResult {
  success: boolean;
  entity: string;
  synced: number;
  failed: number;
  errors: string[];
  duration: number;
}

interface FullSyncResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  duration: number;
  results: {
    clientes: SyncResult;
    contratos: SyncResult;
    boletos: SyncResult;
  };
  totalSynced: number;
  totalFailed: number;
}

interface LocalStats {
  clientes: number;
  contratos: number;
  boletos: number;
  lastSync: string | null;
}

type SyncStep = 'idle' | 'clientes' | 'contratos' | 'boletos' | 'done' | 'error';

export function SyncFromOle() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [currentStep, setCurrentStep] = useState<SyncStep>('idle');
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<FullSyncResult | null>(null);
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const backendUrl = localStorage.getItem("backend_url") || "http://localhost:3000";
  const authToken = localStorage.getItem("integration_auth_token");

  // Buscar estatísticas ao carregar
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!authToken) {
      setLoadingStats(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/sync-from-ole/stats`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFullSync = async () => {
    if (!authToken) {
      toast({
        title: "Não autenticado",
        description: "Configure a integração primeiro para sincronizar os dados.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    setProgress(0);
    setCurrentStep('clientes');
    setSyncResult(null);

    // Simular progresso em tempo real
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    // Atualizar steps baseado no progresso
    setTimeout(() => setCurrentStep('contratos'), 3000);
    setTimeout(() => setCurrentStep('boletos'), 6000);

    try {
      const response = await fetch(`${backendUrl}/api/sync-from-ole/full`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro na sincronização");
      }

      const data = await response.json();
      setSyncResult(data.data);
      setProgress(100);
      setCurrentStep('done');

      // Atualizar estatísticas
      await fetchStats();

      toast({
        title: data.success ? "Sincronização concluída!" : "Sincronização com erros",
        description: `${data.data.totalSynced} registros sincronizados em ${(data.data.duration / 1000).toFixed(1)}s`,
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      clearInterval(progressInterval);
      setCurrentStep('error');
      setProgress(0);
      
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Não foi possível conectar ao backend.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStepStatus = (step: SyncStep) => {
    const steps: SyncStep[] = ['clientes', 'contratos', 'boletos'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (currentStep === 'done') return 'done';
    if (currentStep === 'error') return 'error';
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const StepIndicator = ({ step, label, icon: Icon }: { step: SyncStep; label: string; icon: React.ElementType }) => {
    const status = getStepStatus(step);
    
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        status === 'active' ? 'bg-primary/10 border border-primary/20' :
        status === 'done' ? 'bg-green-500/10 border border-green-500/20' :
        status === 'error' ? 'bg-destructive/10 border border-destructive/20' :
        'bg-muted/50 border border-transparent'
      }`}>
        <div className={`p-2 rounded-full ${
          status === 'active' ? 'bg-primary/20' :
          status === 'done' ? 'bg-green-500/20' :
          status === 'error' ? 'bg-destructive/20' :
          'bg-muted'
        }`}>
          {status === 'active' ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : status === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : status === 'error' ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Icon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className={`font-medium text-sm ${
            status === 'active' ? 'text-primary' :
            status === 'done' ? 'text-green-600' :
            status === 'error' ? 'text-destructive' :
            'text-muted-foreground'
          }`}>
            {label}
          </p>
          {syncResult && status === 'done' && (
            <p className="text-xs text-muted-foreground">
              {step === 'clientes' && `${syncResult.results.clientes.synced} sincronizados`}
              {step === 'contratos' && `${syncResult.results.contratos.synced} sincronizados`}
              {step === 'boletos' && `${syncResult.results.boletos.synced} sincronizados`}
            </p>
          )}
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas do Banco Local */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Banco de Dados Local
              </CardTitle>
              <CardDescription>
                Dados sincronizados da API Olé TV
              </CardDescription>
            </div>
            {stats?.lastSync && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(stats.lastSync)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!authToken ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Configure a integração acima para poder sincronizar dados da Olé TV.
              </p>
            </div>
          ) : loadingStats ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 animate-pulse h-20" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.clientes || 0}</p>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.contratos || 0}</p>
                    <p className="text-sm text-muted-foreground">Contratos</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <Receipt className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.boletos || 0}</p>
                    <p className="text-sm text-muted-foreground">Boletos</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sincronização */}
      {authToken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sincronização Manual
            </CardTitle>
            <CardDescription>
              Busca todos os dados da API Olé TV e armazena no banco local
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress */}
            {syncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso da sincronização</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Steps */}
            {(syncing || syncResult) && (
              <div className="grid gap-3 md:grid-cols-3">
                <StepIndicator step="clientes" label="Clientes" icon={Users} />
                <StepIndicator step="contratos" label="Contratos" icon={FileText} />
                <StepIndicator step="boletos" label="Boletos" icon={Receipt} />
              </div>
            )}

            {/* Result Summary */}
            {syncResult && currentStep === 'done' && (
              <div className={`p-4 rounded-lg ${
                syncResult.success 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  {syncResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      syncResult.success ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {syncResult.success 
                        ? 'Sincronização concluída com sucesso!' 
                        : 'Sincronização concluída com alguns erros'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {syncResult.totalSynced} registros sincronizados 
                      {syncResult.totalFailed > 0 && ` • ${syncResult.totalFailed} falhas`}
                      {' • '}{(syncResult.duration / 1000).toFixed(1)}s
                    </p>
                    
                    {/* Mostrar erros se houver */}
                    {syncResult.totalFailed > 0 && (
                      <div className="mt-3 space-y-1">
                        {[
                          ...syncResult.results.clientes.errors.slice(0, 2),
                          ...syncResult.results.contratos.errors.slice(0, 2),
                          ...syncResult.results.boletos.errors.slice(0, 2),
                        ].map((error, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button 
              onClick={handleFullSync} 
              disabled={syncing}
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Sincronização Completa
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Este processo pode levar alguns minutos dependendo da quantidade de dados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
