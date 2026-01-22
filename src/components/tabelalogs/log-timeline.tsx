import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const getStatusConfig = (status: string) => {
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

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isRecent = (dateString: string, hoursAgo: number = 2) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hoursAgo;
};

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  return formatTime(dateString);
};

// Prioriza erros e avisos recentes
const prioritizeLogs = (logs: LogData[]) => {
  return [...logs].sort((a, b) => {
    const aRecent = isRecent(a.created_at);
    const bRecent = isRecent(b.created_at);
    const aConfig = getStatusConfig(a.codeLog);
    const bConfig = getStatusConfig(b.codeLog);
    
    // Primeiro: erros/avisos recentes
    if (aRecent && !bRecent && aConfig.priority >= 2) return -1;
    if (bRecent && !aRecent && bConfig.priority >= 2) return 1;
    
    // Segundo: por prioridade se ambos recentes
    if (aRecent && bRecent) {
      if (aConfig.priority !== bConfig.priority) {
        return bConfig.priority - aConfig.priority;
      }
    }
    
    // Terceiro: por data
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const groupByDate = (logs: LogData[]) => {
  const groups: { [key: string]: LogData[] } = {};
  
  logs.forEach(log => {
    const date = new Date(log.created_at);
    const key = date.toISOString().split('T')[0];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(log);
  });
  
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, logs]) => ({
      date,
      logs: prioritizeLogs(logs)
    }));
};

const TimelineItem = ({ 
  log, 
  index, 
  onViewDetails,
  isLast,
  isPriority
}: { 
  log: LogData; 
  index: number;
  onViewDetails: (log: LogData) => void;
  isLast: boolean;
  isPriority: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(isPriority);
  const [copied, setCopied] = React.useState(false);
  const config = getStatusConfig(log.codeLog);
  const Icon = config.icon;
  const recent = isRecent(log.created_at);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(log.acao);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="relative flex gap-4 group"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-border via-border/50 to-transparent" />
      )}
      
      {/* Timeline dot */}
      <div className="relative z-10 flex-shrink-0">
        <motion.div 
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.glow} ${isPriority ? 'ring-2 ring-offset-2 ring-offset-background ring-destructive/50' : ''}`}
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
          animate={isPriority ? { scale: [1, 1.05, 1] } : {}}
        >
          <Icon className="h-5 w-5 text-white" />
        </motion.div>
        {isPriority && (
          <motion.div 
            className="absolute -top-1 -right-1 p-1 bg-destructive rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Flame className="h-2.5 w-2.5 text-white" />
          </motion.div>
        )}
      </div>
      
      {/* Content */}
      <Card className={`flex-1 mb-4 overflow-hidden border ${config.border} ${isPriority ? 'bg-destructive/5 border-destructive/40 shadow-md' : 'bg-card/50'} backdrop-blur-sm hover:shadow-md transition-all duration-300 group-hover:border-primary/30`}>
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
                {recent && !isPriority && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Recente
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-foreground truncate" title={log.title}>
                {log.title}
              </h4>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className={`text-sm font-medium ${recent ? 'text-primary' : 'text-foreground'}`}>
                  {recent ? getTimeAgo(log.created_at) : formatTime(log.created_at)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Description preview */}
          <div className="mt-3">
            <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
              {log.acao}
            </p>
            
            {log.acao && log.acao.length > 150 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 h-7 px-2 text-xs text-primary hover:text-primary"
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
              onClick={() => onViewDetails(log)}
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
    </motion.div>
  );
};

const DateHeader = ({ date, count, criticalCount }: { date: string; count: number; criticalCount: number }) => {
  const dateObj = new Date(date + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = dateObj.toDateString() === today.toDateString();
  const isYesterday = dateObj.toDateString() === yesterday.toDateString();
  
  const displayDate = isToday 
    ? 'Hoje' 
    : isYesterday 
    ? 'Ontem' 
    : dateObj.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      });

  return (
    <motion.div 
      className="flex items-center gap-3 mb-4 mt-6 first:mt-0"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
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
    </motion.div>
  );
};

// Alerta de erros recentes no topo
const RecentAlertsHeader = ({ alerts }: { alerts: LogData[] }) => {
  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-gradient-to-r from-destructive/10 via-warning/10 to-transparent rounded-xl border border-destructive/30"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-destructive/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Atenção Necessária</h3>
          <p className="text-sm text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? 'erro ou aviso recente requer' : 'erros ou avisos recentes requerem'} sua atenção
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export function LogTimeline({ data, onViewDetails }: LogTimelineProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [visibleItems, setVisibleItems] = React.useState(15);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  
  // Processar e agrupar logs
  const groupedLogs = React.useMemo(() => groupByDate(data), [data]);
  
  // Flatten para infinite scroll
  const allItems = React.useMemo(() => {
    const items: { type: 'header' | 'log'; data: any; date?: string; criticalCount?: number }[] = [];
    
    groupedLogs.forEach(group => {
      const criticalCount = group.logs.filter(log => {
        const config = getStatusConfig(log.codeLog);
        return config.priority >= 2 && isRecent(log.created_at);
      }).length;
      
      items.push({ type: 'header', data: group.date, date: group.date, criticalCount });
      group.logs.forEach(log => {
        items.push({ type: 'log', data: log, date: group.date });
      });
    });
    
    return items;
  }, [groupedLogs]);

  // Alertas recentes (erros/avisos das últimas 2 horas)
  const recentAlerts = React.useMemo(() => {
    return data.filter(log => {
      const config = getStatusConfig(log.codeLog);
      return config.priority >= 2 && isRecent(log.created_at);
    });
  }, [data]);

  // Infinite scroll com Intersection Observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleItems < allItems.length) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleItems(prev => Math.min(prev + 10, allItems.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const sentinel = document.getElementById('timeline-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [visibleItems, allItems.length]);

  // Reset quando dados mudam
  React.useEffect(() => {
    setVisibleItems(15);
  }, [data]);

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

  const displayedItems = allItems.slice(0, visibleItems);
  const hasMore = visibleItems < allItems.length;

  // Rastrear índice por grupo para animação
  let currentGroupIndex = 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Alertas recentes no topo */}
      <RecentAlertsHeader alerts={recentAlerts} />

      <AnimatePresence mode="sync">
        {displayedItems.map((item, idx) => {
          if (item.type === 'header') {
            currentGroupIndex = 0;
            const logsInGroup = groupedLogs.find(g => g.date === item.date)?.logs || [];
            return (
              <DateHeader 
                key={`header-${item.data}`} 
                date={item.data} 
                count={logsInGroup.length}
                criticalCount={item.criticalCount || 0}
              />
            );
          }
          
          const log = item.data as LogData;
          const config = getStatusConfig(log.codeLog);
          const isPriority = config.priority >= 2 && isRecent(log.created_at);
          const isLastInGroup = idx === displayedItems.length - 1 || displayedItems[idx + 1]?.type === 'header';
          
          const itemIndex = currentGroupIndex;
          currentGroupIndex++;

          return (
            <div key={`log-${log.id_cliente}-${log.created_at}-${idx}`} className="ml-1">
              <TimelineItem
                log={log}
                index={itemIndex}
                onViewDetails={onViewDetails}
                isLast={isLastInGroup && !hasMore}
                isPriority={isPriority}
              />
            </div>
          );
        })}
      </AnimatePresence>

      {/* Sentinel para infinite scroll */}
      <div id="timeline-sentinel" className="h-4" />

      {/* Loading indicator */}
      {isLoadingMore && (
        <motion.div 
          className="flex justify-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando mais...</span>
          </div>
        </motion.div>
      )}

      {/* Info de quantos restam */}
      {hasMore && !isLoadingMore && (
        <motion.div 
          className="flex justify-center pt-2 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-xs text-muted-foreground">
            Role para ver mais ({allItems.length - visibleItems} itens restantes)
          </span>
        </motion.div>
      )}
    </div>
  );
}