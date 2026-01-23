import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  List,
  User,
  FileText,
  RotateCcw,
  Trash2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QueueStats {
  pending: number;
  processing: number;
  success: number;
  failed: number;
  total: number;
  recentActivity: {
    lastProcessed: string | null;
    lastSuccess: string | null;
    lastFailed: string | null;
  };
}

interface QueueItem {
  id: string;
  action: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledFor: string | null;
  payload: {
    clientName?: string;
    document?: string;
  };
}

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'idle';

export function QueueMonitor() {
  const { toast } = useToast();
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const backendUrl = localStorage.getItem("backend_url") || "http://localhost:3000";
  const authToken = localStorage.getItem("integration_auth_token");

  const fetchStats = useCallback(async () => {
    if (!authToken) return;

    try {
      const response = await fetch(`${backendUrl}/api/queue/stats`, {
        headers: { "Authorization": `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Erro ao buscar stats da fila:", error);
    } finally {
      setLoading(false);
    }
  }, [authToken, backendUrl]);

  const fetchItems = useCallback(async (status?: string) => {
    if (!authToken) return;

    setLoadingItems(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (status) params.append('status', status);

      const response = await fetch(`${backendUrl}/api/queue/items?${params}`, {
        headers: { "Authorization": `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.data.items || []);
      }
    } catch (error) {
      console.error("Erro ao buscar itens da fila:", error);
    } finally {
      setLoadingItems(false);
    }
  }, [authToken, backendUrl]);

  const handleRetry = async (queueId: string) => {
    if (!authToken) return;

    setRetryingId(queueId);
    try {
      const response = await fetch(`${backendUrl}/api/queue/retry/${queueId}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast({
          title: "Retry agendado",
          description: "O item foi reagendado para processamento.",
        });
        await fetchStats();
        await fetchItems();
      } else {
        throw new Error("Falha ao reagendar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reagendar o item.",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (queueId: string) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${backendUrl}/api/queue/${queueId}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${authToken}` },
      });

      if (response.ok) {
        toast({
          title: "Item removido",
          description: "O item foi removido da fila.",
        });
        await fetchStats();
        await fetchItems();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o item.",
        variant: "destructive",
      });
    }
  };

  // Carrega dados iniciais
  useEffect(() => {
    fetchStats();
    fetchItems();
  }, [fetchStats, fetchItems]);

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
      if (stats?.pending || stats?.processing) {
        fetchItems();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats, fetchItems, stats?.pending, stats?.processing]);

  // Determina o status de saúde da fila
  const getHealthStatus = (): HealthStatus => {
    if (!stats) return 'idle';
    
    const lastProcessedTime = stats.recentActivity.lastProcessed 
      ? new Date(stats.recentActivity.lastProcessed).getTime()
      : null;
    
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    // Se tem itens processando mas não houve atividade recente
    if (stats.processing > 0 && lastProcessedTime && lastProcessedTime < fifteenMinutesAgo) {
      return 'critical'; // Possível travamento
    }

    // Se tem pendentes mas não está processando e não houve atividade
    if (stats.pending > 0 && stats.processing === 0 && lastProcessedTime && lastProcessedTime < fiveMinutesAgo) {
      return 'warning'; // Fila parada
    }

    // Se tem falhas recentes
    if (stats.failed > 5) {
      return 'warning';
    }

    // Se está processando ou houve atividade recente
    if (stats.processing > 0 || (lastProcessedTime && lastProcessedTime > fiveMinutesAgo)) {
      return 'healthy';
    }

    return 'idle';
  };

  const healthStatus = getHealthStatus();

  const getHealthConfig = () => {
    switch (healthStatus) {
      case 'healthy':
        return {
          label: 'Saudável',
          description: 'A fila está processando normalmente',
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          pulse: 'bg-green-500'
        };
      case 'warning':
        return {
          label: 'Atenção',
          description: 'Há itens pendentes sem processamento recente',
          icon: AlertTriangle,
          color: 'text-amber-600',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          pulse: 'bg-amber-500'
        };
      case 'critical':
        return {
          label: 'Travada',
          description: 'A fila parece estar travada - verifique os logs do servidor',
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          pulse: 'bg-red-500'
        };
      default:
        return {
          label: 'Ociosa',
          description: 'Nenhuma atividade recente na fila',
          icon: Pause,
          color: 'text-muted-foreground',
          bg: 'bg-muted/50',
          border: 'border-muted',
          pulse: 'bg-muted-foreground'
        };
    }
  };

  const healthConfig = getHealthConfig();
  const HealthIcon = healthConfig.icon;

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs}s atrás`;
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, { label: string; icon: typeof User }> = {
      'CREATE_CLIENT': { label: 'Criar Cliente', icon: User },
      'UPDATE_CLIENT': { label: 'Atualizar Cliente', icon: User },
      'CREATE_CONTRACT': { label: 'Criar Contrato', icon: FileText },
      'CANCEL_CONTRACT': { label: 'Cancelar Contrato', icon: FileText },
    };
    return actionMap[action] || { label: action, icon: List };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pendente</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Processando</Badge>;
      case 'SUCCESS':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Sucesso</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!authToken) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Configure a integração primeiro para monitorar a fila.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status de Saúde */}
      <Card className={`${healthConfig.bg} ${healthConfig.border} border`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="relative">
                <Activity className={`h-5 w-5 ${healthConfig.color}`} />
                <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${healthConfig.pulse} ${healthStatus === 'healthy' ? 'animate-pulse' : ''}`} />
              </div>
              Monitor da Fila
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-1 text-xs"
              >
                {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchStats(); fetchItems(); }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${healthConfig.bg}`}>
              <HealthIcon className={`h-6 w-6 ${healthConfig.color}`} />
            </div>
            <div>
              <p className={`font-semibold ${healthConfig.color}`}>{healthConfig.label}</p>
              <p className="text-sm text-muted-foreground">{healthConfig.description}</p>
            </div>
          </div>

          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-3">
              Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => fetchItems('PENDING')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => fetchItems('PROCESSING')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">Processando</p>
                </div>
                <Loader2 className={`h-8 w-8 text-purple-600/20 ${stats.processing > 0 ? 'animate-spin' : ''}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => fetchItems('SUCCESS')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-red-500/50 transition-colors" onClick={() => fetchItems('FAILED')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Falharam</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atividade Recente */}
      {stats?.recentActivity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último processamento</p>
                  <p className="font-medium">{formatTimeAgo(stats.recentActivity.lastProcessed)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Último sucesso</p>
                  <p className="font-medium text-green-600">{formatTimeAgo(stats.recentActivity.lastSuccess)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Última falha</p>
                  <p className="font-medium text-red-600">{formatTimeAgo(stats.recentActivity.lastFailed)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Itens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Itens na Fila
              </CardTitle>
              <CardDescription>Clique nos cards acima para filtrar por status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchItems()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingItems ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum item na fila</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const actionInfo = formatAction(item.action);
                    const ActionIcon = actionInfo.icon;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActionIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{actionInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.payload.clientName || '-'}</p>
                            <p className="text-xs text-muted-foreground">{item.payload.document || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <span className={item.attempts >= item.maxAttempts ? 'text-red-600' : ''}>
                            {item.attempts}/{item.maxAttempts}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(item.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === 'FAILED' && (
                              <Button
                                variant="ghost"
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover item da fila?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O item "{item.payload.clientName}" será removido permanentemente da fila de sincronização.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Erro do último item */}
          {items.some(i => i.status === 'FAILED' && i.lastError) && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="font-medium text-red-600 mb-2">Último erro registrado:</p>
              <p className="text-sm text-muted-foreground font-mono">
                {items.find(i => i.status === 'FAILED' && i.lastError)?.lastError}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}