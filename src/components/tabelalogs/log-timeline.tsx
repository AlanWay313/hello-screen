import * as React from "react";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Activity,
  Clock,
  FileText,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LogData {
  id_cliente: string;
  codeLog: string;
  title: string;
  acao: string;
  created_at: string;
  [key: string]: any;
}

interface LogTimelineProps {
  data: LogData[];
  onViewDetails: (log: LogData) => void;
}

// Cache para configs de status
const statusConfigCache = new Map<string, ReturnType<typeof getStatusConfigInternal>>();

const getStatusConfigInternal = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'error':
      return { 
        gradient: 'from-destructive to-destructive/70',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        text: 'text-destructive', 
        icon: AlertCircle,
        label: 'Erro',
        glow: 'shadow-destructive/20',
        priority: 3
      };
    case 'warning':
      return { 
        gradient: 'from-warning to-warning/70',
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        text: 'text-warning', 
        icon: AlertTriangle,
        label: 'Aviso',
        glow: 'shadow-warning/20',
        priority: 2
      };
    case 'success':
      return { 
        gradient: 'from-success to-success/70',
        bg: 'bg-success/10',
        border: 'border-success/30',
        text: 'text-success', 
        icon: CheckCircle,
        label: 'Sucesso',
        glow: 'shadow-success/20',
        priority: 1
      };
    case 'info':
      return { 
        gradient: 'from-primary to-accent',
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        text: 'text-primary', 
        icon: Info,
        label: 'Info',
        glow: 'shadow-primary/20',
        priority: 0
      };
    default:
      return { 
        gradient: 'from-muted-foreground to-muted-foreground/70',
        bg: 'bg-secondary',
        border: 'border-border',
        text: 'text-muted-foreground', 
        icon: Activity,
        label: status || 'Log',
        glow: 'shadow-muted/20',
        priority: 0
      };
  }
};

const getStatusConfig = (status: string) => {
  const key = status?.toLowerCase() || '';
  if (!statusConfigCache.has(key)) {
    statusConfigCache.set(key, getStatusConfigInternal(status));
  }
  return statusConfigCache.get(key)!;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isRecent = (dateString: string, hoursAgo: number = 2) => {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hoursAgo;
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  return formatTime(dateString);
};

// Item de timeline otimizado com React.memo
const TimelineItem = React.memo(({ 
  log, 
  onViewDetails,
  isLast,
  isPriority
}: { 
  log: LogData; 
  onViewDetails: (log: LogData) => void;
  isLast: boolean;
  isPriority: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const config = getStatusConfig(log.codeLog);
  const Icon = config.icon;
  const recent = isRecent(log.created_at);

  const copyToClipboard = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(log.acao);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  }, [log.acao]);

  const handleViewDetails = React.useCallback(() => {
    onViewDetails(log);
  }, [onViewDetails, log]);

  const toggleExpand = React.useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="relative flex gap-4 group animate-fade-in">
      {/* Timeline line - simplificado */}
      {!isLast && (
        <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-border/50" />
      )}
      
      {/* Timeline dot - sem animação */}
      <div className="relative z-10 flex-shrink-0">
        <div 
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md ${isPriority ? 'ring-2 ring-offset-2 ring-offset-background ring-destructive/50' : ''}`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        {isPriority && (
          <div className="absolute -top-1 -right-1 p-1 bg-destructive rounded-full">
            <Flame className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
      
      {/* Content - simplificado */}
      <Card className={`flex-1 mb-4 overflow-hidden border ${config.border} ${isPriority ? 'bg-destructive/5 border-destructive/40' : 'bg-card/50'} transition-shadow hover:shadow-md`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className={`${config.bg} ${config.text} border-transparent font-medium`}>
                  {config.label}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {log.id_cliente}
                </Badge>
                {isPriority && (
                  <Badge className="bg-destructive/90 text-destructive-foreground text-xs gap-1">
                    <Flame className="h-3 w-3" />
                    Atenção
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-foreground truncate" title={log.title}>
                {log.title}
              </h4>
            </div>
            
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-medium ${recent ? 'text-primary' : 'text-foreground'}`}>
                {recent ? getTimeAgo(log.created_at) : formatTime(log.created_at)}
              </p>
            </div>
          </div>
          
          {/* Description */}
          <div className="mt-3">
            <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
              {log.acao}
            </p>
            
            {log.acao && log.acao.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpand}
                className="mt-1 h-7 px-2 text-xs text-primary"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver mais
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            <Button
              variant={isPriority ? "default" : "outline"}
              size="sm"
              onClick={handleViewDetails}
              className="h-8 gap-1.5 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver Detalhes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders desnecessários
  return prevProps.log.id_cliente === nextProps.log.id_cliente &&
         prevProps.log.created_at === nextProps.log.created_at &&
         prevProps.isLast === nextProps.isLast &&
         prevProps.isPriority === nextProps.isPriority;
});

TimelineItem.displayName = 'TimelineItem';

// Header de data otimizado
const DateHeader = React.memo(({ date, count, criticalCount }: { date: string; count: number; criticalCount: number }) => {
  const displayDate = React.useMemo(() => {
    const dateObj = new Date(date + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Hoje';
    if (isYesterday) return 'Ontem';
    return dateObj.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    });
  }, [date]);

  return (
    <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
        <Clock className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground capitalize">{displayDate}</span>
      </div>
      <Badge variant="secondary" className="font-medium">
        {count} {count === 1 ? 'evento' : 'eventos'}
      </Badge>
      {criticalCount > 0 && (
        <Badge className="bg-destructive/90 text-destructive-foreground gap-1">
          <AlertCircle className="h-3 w-3" />
          {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
        </Badge>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
});

DateHeader.displayName = 'DateHeader';

// Alerta de erros recentes
const RecentAlertsHeader = React.memo(({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-destructive/10 via-warning/10 to-transparent rounded-xl border border-destructive/30 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Atenção Necessária</h3>
          <p className="text-sm text-muted-foreground">
            {count} {count === 1 ? 'erro ou aviso recente requer' : 'erros ou avisos recentes requerem'} sua atenção
          </p>
        </div>
      </div>
    </div>
  );
});

RecentAlertsHeader.displayName = 'RecentAlertsHeader';

// Processar dados uma vez só
interface ProcessedData {
  groups: Array<{
    date: string;
    logs: LogData[];
    criticalCount: number;
  }>;
  recentAlertsCount: number;
}

const processLogs = (data: LogData[]): ProcessedData => {
  const groups: { [key: string]: LogData[] } = {};
  let recentAlertsCount = 0;
  
  // Agrupar por data
  data.forEach(log => {
    const dateKey = new Date(log.created_at).toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(log);
    
    // Contar alertas recentes
    const config = getStatusConfig(log.codeLog);
    if (config.priority >= 2 && isRecent(log.created_at)) {
      recentAlertsCount++;
    }
  });
  
  // Ordenar e processar grupos
  const sortedGroups = Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, logs]) => {
      // Ordenar logs: prioridade + recência
      const sortedLogs = [...logs].sort((a, b) => {
        const aConfig = getStatusConfig(a.codeLog);
        const bConfig = getStatusConfig(b.codeLog);
        const aRecent = isRecent(a.created_at);
        const bRecent = isRecent(b.created_at);
        
        // Erros/avisos recentes primeiro
        const aScore = (aRecent && aConfig.priority >= 2) ? 100 : 0;
        const bScore = (bRecent && bConfig.priority >= 2) ? 100 : 0;
        
        if (aScore !== bScore) return bScore - aScore;
        
        // Depois por data
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const criticalCount = sortedLogs.filter(log => {
        const config = getStatusConfig(log.codeLog);
        return config.priority >= 2 && isRecent(log.created_at);
      }).length;
      
      return { date, logs: sortedLogs, criticalCount };
    });
  
  return { groups: sortedGroups, recentAlertsCount };
};

export function LogTimeline({ data, onViewDetails }: LogTimelineProps) {
  const [visibleCount, setVisibleCount] = React.useState(20);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Processar dados apenas quando mudam
  const processed = React.useMemo(() => processLogs(data), [data]);
  
  // Flatten para renderização
  const flatItems = React.useMemo(() => {
    const items: Array<{ type: 'header' | 'log'; key: string; data: any; groupDate?: string; criticalCount?: number }> = [];
    
    processed.groups.forEach(group => {
      items.push({ 
        type: 'header', 
        key: `header-${group.date}`, 
        data: group.date,
        criticalCount: group.criticalCount
      });
      
      group.logs.forEach((log, idx) => {
        items.push({ 
          type: 'log', 
          key: `log-${group.date}-${log.id_cliente}-${idx}`, 
          data: log,
          groupDate: group.date
        });
      });
    });
    
    return items;
  }, [processed.groups]);

  // Reset ao mudar dados
  React.useEffect(() => {
    setVisibleCount(20);
  }, [data]);

  // Infinite scroll com IntersectionObserver
  React.useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < flatItems.length && !isLoadingMore) {
          setIsLoadingMore(true);
          // Usar requestAnimationFrame para não bloquear
          requestAnimationFrame(() => {
            setTimeout(() => {
              setVisibleCount(prev => Math.min(prev + 15, flatItems.length));
              setIsLoadingMore(false);
            }, 100);
          });
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [visibleCount, flatItems.length, isLoadingMore]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-secondary/50 rounded-full mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Nenhum log encontrado</h3>
        <p className="text-sm text-muted-foreground">Ajuste os filtros para ver mais resultados</p>
      </div>
    );
  }

  const visibleItems = flatItems.slice(0, visibleCount);
  const hasMore = visibleCount < flatItems.length;

  return (
    <div className="relative">
      {/* Alertas recentes */}
      <RecentAlertsHeader count={processed.recentAlertsCount} />

      {/* Lista virtualizada simplificada */}
      {visibleItems.map((item, idx) => {
        if (item.type === 'header') {
          const group = processed.groups.find(g => g.date === item.data);
          return (
            <DateHeader 
              key={item.key}
              date={item.data} 
              count={group?.logs.length || 0}
              criticalCount={item.criticalCount || 0}
            />
          );
        }
        
        const log = item.data as LogData;
        const config = getStatusConfig(log.codeLog);
        const isPriority = config.priority >= 2 && isRecent(log.created_at);
        const isLast = idx === visibleItems.length - 1 && !hasMore;
        
        return (
          <div key={item.key} className="ml-1">
            <TimelineItem
              log={log}
              onViewDetails={onViewDetails}
              isLast={isLast}
              isPriority={isPriority}
            />
          </div>
        );
      })}

      {/* Sentinel para infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        </div>
      )}

      {/* Info restantes */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center pt-2 pb-4">
          <span className="text-xs text-muted-foreground">
            Role para ver mais ({flatItems.length - visibleCount} restantes)
          </span>
        </div>
      )}
    </div>
  );
}