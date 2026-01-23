import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Ban, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { buscarBloqueiosContrato, Bloqueio } from '@/services/bloqueiosContrato';
import { motion } from 'framer-motion';

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
  const [mostrarTodos, setMostrarTodos] = React.useState(false);

  const fetchBloqueios = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Busca todos os bloqueios (ativos e inativos)
      const response = await buscarBloqueiosContrato(idContrato, false);
      
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

  const bloqueiosAtivos = bloqueios.filter(b => b.status_nome.toLowerCase().includes('ativo') && !b.status_nome.toLowerCase().includes('inativo'));
  const bloqueiosInativos = bloqueios.filter(b => b.status_nome.toLowerCase().includes('inativo'));

  const bloqueiosExibidos = mostrarTodos ? bloqueios : bloqueiosAtivos;

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Bloqueios do Contrato</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {bloqueios.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarTodos(!mostrarTodos)}
                className="text-xs"
              >
                {mostrarTodos ? 'Ver apenas ativos' : `Ver todos (${bloqueios.length})`}
              </Button>
            )}
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
        {bloqueios.length > 0 && (
          <div className="flex gap-4 text-sm mt-2">
            <span className="text-destructive font-medium">
              {bloqueiosAtivos.length} ativo{bloqueiosAtivos.length !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground">
              {bloqueiosInativos.length} finalizado{bloqueiosInativos.length !== 1 ? 's' : ''}
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
        ) : bloqueiosExibidos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-success opacity-70" />
            <p className="text-sm font-medium text-success">
              {mostrarTodos ? 'Nenhum bloqueio registrado' : 'Sem bloqueios ativos'}
            </p>
            {!mostrarTodos && bloqueiosInativos.length > 0 && (
              <p className="text-xs mt-1">
                {bloqueiosInativos.length} bloqueio{bloqueiosInativos.length !== 1 ? 's' : ''} finalizado{bloqueiosInativos.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bloqueiosExibidos.map((bloqueio, index) => (
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
                <div className="flex-shrink-0">
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
