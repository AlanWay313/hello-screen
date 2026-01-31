import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import { Ban, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { buscarBloqueiosContrato, Bloqueio, desbloquearContrato } from '@/services/bloqueiosContrato';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface BloqueiosContratoProps {
  idContrato: string | number;
}

function BloqueiosSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function BloqueiosContrato({ idContrato }: BloqueiosContratoProps) {
  const [bloqueios, setBloqueios] = React.useState<Bloqueio[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [desbloqueandoId, setDesbloqueandoId] = React.useState<string | null>(null);

  const fetchBloqueios = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Busca apenas bloqueios ativos
      const response = await buscarBloqueiosContrato(idContrato, true);
      
      if (response.error) {
        setError(response.error);
        setBloqueios([]);
      } else {
        setBloqueios(response.bloqueios || []);
      }
    } catch (err) {
      setError('Erro ao carregar bloqueios');
    } finally {
      setIsLoading(false);
    }
  }, [idContrato]);

  React.useEffect(() => {
    fetchBloqueios();
  }, [fetchBloqueios]);

  // A API já está sendo chamada com ativos=true, mas mantemos a filtragem como segurança.
  const bloqueiosAtivos = bloqueios.filter(
    (b) => b.status_nome.toLowerCase().includes('ativo') && !b.status_nome.toLowerCase().includes('inativo')
  );

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('inativo')) {
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (status: string) => {
    const isAtivo = status.toLowerCase().includes('ativo') && !status.toLowerCase().includes('inativo');
    return (
      <Badge variant={isAtivo ? 'destructive' : 'secondary'} className="text-xs">
        {isAtivo ? 'Ativo' : 'Finalizado'}
      </Badge>
    );
  };

  const getTipoIcon = (tipoId: string) => {
    switch (tipoId) {
      case '1':
        return <Ban className="h-5 w-5 text-destructive" />;
      case '2':
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleDesbloquear = async (bloqueio: Bloqueio) => {
    setDesbloqueandoId(bloqueio.id);
    try {
      const res = await desbloquearContrato(idContrato, bloqueio.id);
      if (!res.retorno_status) {
        toast({
          variant: 'destructive',
          title: 'Falha ao desbloquear',
          description: res.error || res.mensagem || 'A API não confirmou o desbloqueio.',
        });
        return;
      }

      toast({
        title: 'Contrato desbloqueado',
        description: res.mensagem || 'Desbloqueio realizado com sucesso.',
      });

      await fetchBloqueios();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desbloquear',
        description: 'Tente novamente em instantes.',
      });
    } finally {
      setDesbloqueandoId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Bloqueios do Contrato</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchBloqueios}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {bloqueiosAtivos.length > 0 && (
          <div className="flex gap-4 text-sm mt-2">
            <span className="text-destructive font-medium">
              {bloqueiosAtivos.length} ativo{bloqueiosAtivos.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <BloqueiosSkeleton />
        ) : error ? (
          <div className="text-center py-6 text-muted-foreground">
            <Ban className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchBloqueios} className="mt-3">
              Tentar novamente
            </Button>
          </div>
        ) : bloqueiosAtivos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success opacity-70" />
            <p className="text-sm font-medium text-success">
              Sem bloqueios ativos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bloqueiosAtivos.map((bloqueio, index) => (
              <motion.div
                key={bloqueio.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  bloqueio.status_nome.toLowerCase().includes('ativo') && 
                  !bloqueio.status_nome.toLowerCase().includes('inativo')
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="mt-0.5">
                  {getTipoIcon(bloqueio.tipo_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{bloqueio.tipo_nome}</span>
                    {getStatusBadge(bloqueio.status_nome)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <p>Início: {bloqueio.inicio}</p>
                    {bloqueio.termino && <p>Término: {bloqueio.termino}</p>}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={desbloqueandoId === bloqueio.id || isLoading}
                      >
                        {desbloqueandoId === bloqueio.id ? 'Desbloqueando…' : 'Desbloquear'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desbloquear contrato?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá remover o bloqueio <span className="font-medium">{bloqueio.tipo_nome}</span> do contrato.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDesbloquear(bloqueio)}>
                          Confirmar desbloqueio
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {getStatusIcon(bloqueio.status_nome)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
