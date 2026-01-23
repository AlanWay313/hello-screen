import * as React from "react";
import { motion } from "framer-motion";
import { Tv, Wifi, WifiOff, RefreshCw, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buscarPontosRegistrados, type Ponto } from "@/services/pontosRegistrados";

interface PontosRegistradosProps {
  idContrato: string | number;
}

function PontosSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function PontosRegistrados({ idContrato }: PontosRegistradosProps) {
  const [pontos, setPontos] = React.useState<Ponto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const fetchPontos = React.useCallback(async () => {
    if (!idContrato) return;
    
    setIsLoading(true);
    setError(false);
    
    try {
      const response = await buscarPontosRegistrados(idContrato);
      if (response.retorno_status) {
        setPontos(response.pontos);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Erro ao buscar pontos:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [idContrato]);

  React.useEffect(() => {
    fetchPontos();
  }, [fetchPontos]);

  const onlineCount = pontos.filter(p => p.status === 'online').length;
  const offlineCount = pontos.filter(p => p.status === 'offline').length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tv className="h-4 w-4 text-primary" />
            </div>
            Pontos Registrados
            {!isLoading && pontos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pontos.length} {pontos.length === 1 ? 'dispositivo' : 'dispositivos'}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchPontos}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Resumo de status */}
        {!isLoading && pontos.length > 0 && (
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">
                {onlineCount} online
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">
                {offlineCount} offline
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <PontosSkeleton />
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <WifiOff className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum ponto registrado para este contrato.</p>
            <Button variant="ghost" size="sm" onClick={fetchPontos} className="mt-2">
              Aguarde até que algum aparelho se conecte
            </Button>
          </div>
        ) : pontos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tv className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum ponto registrado para este contrato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pontos.map((ponto, index) => (
              <motion.div
                key={ponto.mac || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-4 rounded-xl border transition-colors ${
                  ponto.status === 'online' 
                    ? 'bg-success/5 border-success/20 hover:border-success/40' 
                    : 'bg-muted/30 border-border/50 hover:border-border'
                }`}
              >
                {/* Indicador de status */}
                <div className={`absolute top-3 right-3 h-3 w-3 rounded-full ${
                  ponto.status === 'online' 
                    ? 'bg-success animate-pulse' 
                    : 'bg-destructive'
                }`} />
                
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    ponto.status === 'online' 
                      ? 'bg-success/10' 
                      : 'bg-muted'
                  }`}>
                    {ponto.status === 'online' ? (
                      <Wifi className="h-5 w-5 text-success" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground truncate">
                        {ponto.marca}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {ponto.modelo}
                    </p>
                    
                    <p className="text-xs text-muted-foreground/70 font-mono truncate">
                      MAC: {ponto.mac}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Badge 
                    variant={ponto.status === 'online' ? 'default' : 'secondary'}
                    className={`text-xs ${
                      ponto.status === 'online' 
                        ? 'bg-success/10 text-success border-success/20' 
                        : ''
                    }`}
                  >
                    {ponto.status === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
