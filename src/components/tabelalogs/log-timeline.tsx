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
  ChevronUp
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
        glow: 'shadow-destructive/20'
      };
    case 'success':
      return { 
        gradient: 'from-success to-success/70',
        bg: 'bg-success/10',
        border: 'border-success/30',
        text: 'text-success', 
        icon: CheckCircle,
        label: 'Sucesso',
        glow: 'shadow-success/20'
      };
    case 'warning':
      return { 
        gradient: 'from-warning to-warning/70',
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        text: 'text-warning', 
        icon: AlertTriangle,
        label: 'Aviso',
        glow: 'shadow-warning/20'
      };
    case 'info':
      return { 
        gradient: 'from-primary to-accent',
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        text: 'text-primary', 
        icon: Info,
        label: 'Info',
        glow: 'shadow-primary/20'
      };
    default:
      return { 
        gradient: 'from-muted-foreground to-muted-foreground/70',
        bg: 'bg-secondary',
        border: 'border-border',
        text: 'text-muted-foreground', 
        icon: Activity,
        label: status || 'Log',
        glow: 'shadow-muted/20'
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
      logs: logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }));
};

const TimelineItem = ({ 
  log, 
  index, 
  onViewDetails,
  isLast 
}: { 
  log: LogData; 
  index: number;
  onViewDetails: (log: LogData) => void;
  isLast: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const config = getStatusConfig(log.codeLog);
  const Icon = config.icon;

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
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative flex gap-4 group"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-border via-border/50 to-transparent" />
      )}
      
      {/* Timeline dot */}
      <div className="relative z-10 flex-shrink-0">
        <motion.div 
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.glow}`}
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="h-5 w-5 text-white" />
        </motion.div>
      </div>
      
      {/* Content */}
      <Card className={`flex-1 mb-4 overflow-hidden border ${config.border} bg-card/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 group-hover:border-primary/30`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`${config.bg} ${config.text} border-transparent font-medium`}>
                  {config.label}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {log.id_cliente}
                </Badge>
              </div>
              <h4 className="font-semibold text-foreground truncate" title={log.title}>
                {log.title}
              </h4>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{formatTime(log.created_at)}</p>
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
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(log)}
              className="h-8 gap-1.5 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              Detalhes
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

const DateHeader = ({ date, count }: { date: string; count: number }) => {
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
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </motion.div>
  );
};

export function LogTimeline({ data, onViewDetails }: LogTimelineProps) {
  const groupedLogs = React.useMemo(() => groupByDate(data), [data]);
  const [visibleGroups, setVisibleGroups] = React.useState(3);

  const loadMore = () => {
    setVisibleGroups(prev => prev + 3);
  };

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

  const displayedGroups = groupedLogs.slice(0, visibleGroups);
  const hasMore = visibleGroups < groupedLogs.length;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {displayedGroups.map((group, groupIndex) => (
          <div key={group.date}>
            <DateHeader date={group.date} count={group.logs.length} />
            <div className="ml-1">
              {group.logs.map((log, index) => (
                <TimelineItem
                  key={`${log.id_cliente}-${log.created_at}-${index}`}
                  log={log}
                  index={index}
                  onViewDetails={onViewDetails}
                  isLast={groupIndex === displayedGroups.length - 1 && index === group.logs.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </AnimatePresence>

      {hasMore && (
        <motion.div 
          className="flex justify-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            variant="outline"
            onClick={loadMore}
            className="gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            Carregar mais ({groupedLogs.length - visibleGroups} dias restantes)
          </Button>
        </motion.div>
      )}
    </div>
  );
}