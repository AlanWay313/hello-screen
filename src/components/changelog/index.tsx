import { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Zap, 
  Palette, 
  Gauge, 
  Bell, 
  LayoutGrid,
  GitCommitHorizontal,
  Filter,
  CheckCircle,
  ArrowRight,
  Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix' | 'visual';
  icon: React.ReactNode;
  highlights?: string[];
}

// Versão atual do changelog - incrementar a cada atualização
const CURRENT_VERSION = '1.2.0';
const STORAGE_KEY = 'sysprov_last_seen_version';

const changelog: ChangelogItem[] = [
  {
    id: '1',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Sistema de Notificações',
    description: 'Agora você recebe notificações em tempo real sobre novos clientes cadastrados, erros e avisos do sistema.',
    type: 'feature',
    icon: <Bell className="h-5 w-5" />,
    highlights: [
      'Notificações de novos clientes',
      'Alertas de erros e avisos',
      'Badge com contagem de não lidas',
    ],
  },
  {
    id: '2',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Visualização Timeline nos Logs',
    description: 'Nova forma de visualizar os logs do sistema em formato de linha do tempo, com priorização de erros recentes.',
    type: 'feature',
    icon: <GitCommitHorizontal className="h-5 w-5" />,
    highlights: [
      'Agrupamento por data',
      'Destaque para erros críticos',
      'Scroll infinito otimizado',
    ],
  },
  {
    id: '3',
    version: '1.1.0',
    date: '21 Jan 2026',
    title: 'Dashboard com Widgets Personalizáveis',
    description: 'Personalize seu dashboard arrastando e reorganizando os widgets da forma que preferir.',
    type: 'feature',
    icon: <LayoutGrid className="h-5 w-5" />,
    highlights: [
      'Drag and drop para reordenar',
      'Mostrar/ocultar widgets',
      'Configurações salvas automaticamente',
    ],
  },
  {
    id: '4',
    version: '1.1.0',
    date: '21 Jan 2026',
    title: 'Sistema de Cache Inteligente',
    description: 'Melhoramos a performance com cache automático de dados, reduzindo o tempo de carregamento.',
    type: 'improvement',
    icon: <Gauge className="h-5 w-5" />,
    highlights: [
      'Cache de 5 minutos para dados',
      'Indicador de última atualização',
      'Botão para forçar refresh',
    ],
  },
  {
    id: '5',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Interface Visual Renovada',
    description: 'Novo design moderno com suporte a tema escuro, gradientes elegantes e animações suaves.',
    type: 'visual',
    icon: <Palette className="h-5 w-5" />,
    highlights: [
      'Tema claro e escuro',
      'Cards com efeito glassmorphism',
      'Animações de transição',
    ],
  },
  {
    id: '6',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Filtros Avançados de Logs',
    description: 'Filtre logs por data, status, busca global e remova automaticamente avisos repetitivos.',
    type: 'improvement',
    icon: <Filter className="h-5 w-5" />,
    highlights: [
      'Filtro por período',
      'Busca global',
      'Omissão automática de CPF/CNPJ duplicado',
    ],
  },
];

const getTypeConfig = (type: ChangelogItem['type']) => {
  switch (type) {
    case 'feature':
      return { label: 'Novidade', color: 'bg-primary text-primary-foreground' };
    case 'improvement':
      return { label: 'Melhoria', color: 'bg-success text-success-foreground' };
    case 'fix':
      return { label: 'Correção', color: 'bg-warning text-warning-foreground' };
    case 'visual':
      return { label: 'Visual', color: 'bg-accent text-accent-foreground' };
    default:
      return { label: 'Atualização', color: 'bg-secondary text-secondary-foreground' };
  }
};

export function useChangelog() {
  const [showModal, setShowModal] = useState(false);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    
    if (!lastSeenVersion || lastSeenVersion !== CURRENT_VERSION) {
      // Mostrar modal após um pequeno delay para não atrapalhar o carregamento
      const timer = setTimeout(() => {
        setShowModal(true);
        setHasNewUpdates(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissModal = () => {
    setShowModal(false);
    setHasNewUpdates(false);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  };

  const openModal = () => {
    setShowModal(true);
  };

  return {
    showModal,
    hasNewUpdates,
    dismissModal,
    openModal,
    currentVersion: CURRENT_VERSION,
  };
}

export function ChangelogModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen) return null;

  // Agrupar por versão
  const groupedByVersion = changelog.reduce((acc, item) => {
    if (!acc[item.version]) {
      acc[item.version] = { date: item.date, items: [] };
    }
    acc[item.version].items.push(item);
    return acc;
  }, {} as Record<string, { date: string; items: ChangelogItem[] }>);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent border-b border-border overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl" />
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground">Novidades</h2>
                    <Badge className="bg-primary/90 text-primary-foreground">
                      v{CURRENT_VERSION}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confira as últimas melhorias do sistema
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
            <div className="space-y-8">
              {Object.entries(groupedByVersion).map(([version, { date, items }]) => (
                <div key={version}>
                  {/* Version Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="text-sm font-semibold">
                      Versão {version}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Items */}
                  <div className="space-y-4">
                    {items.map((item, index) => {
                      const typeConfig = getTypeConfig(item.type);
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex gap-4">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                              {item.icon}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">
                                  {item.title}
                                </h3>
                                <Badge className={`text-xs ${typeConfig.color}`}>
                                  {typeConfig.label}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3">
                                {item.description}
                              </p>

                              {item.highlights && (
                                <ul className="space-y-1.5">
                                  {item.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
                                      <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                                      {highlight}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/20">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Estamos sempre melhorando!
              </p>
              <Button onClick={onClose} className="gap-2">
                Entendi, vamos lá!
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Botão para abrir o changelog manualmente
export function ChangelogButton({ 
  onClick, 
  hasNew 
}: { 
  onClick: () => void; 
  hasNew?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-2 text-muted-foreground hover:text-foreground relative"
    >
      <Zap className="h-4 w-4" />
      <span className="hidden sm:inline">Novidades</span>
      {hasNew && (
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full animate-pulse" />
      )}
    </Button>
  );
}