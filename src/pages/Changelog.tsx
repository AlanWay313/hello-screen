import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Palette, 
  Gauge, 
  Bell, 
  LayoutGrid,
  GitCommitHorizontal,
  Filter,
  CheckCircle,
  Calendar,
  Tag,
  Search,
  Rocket,
  Code,
  Shield,
  Users,
  Database
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix' | 'visual' | 'security' | 'performance';
  icon: React.ReactNode;
  highlights?: string[];
  breaking?: boolean;
}

// Histórico completo de versões
const fullChangelog: ChangelogEntry[] = [
  // v1.2.0
  {
    id: '1',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Sistema de Notificações em Tempo Real',
    description: 'Implementação de um sistema completo de notificações que monitora os logs do sistema e alerta sobre novos clientes, erros e avisos importantes.',
    type: 'feature',
    icon: <Bell className="h-5 w-5" />,
    highlights: [
      'Notificações automáticas de novos clientes cadastrados',
      'Alertas de erros e avisos do sistema',
      'Badge com contagem de notificações não lidas',
      'Polling a cada 60 segundos para atualizações',
      'Persistência no localStorage',
    ],
  },
  {
    id: '2',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Visualização Timeline nos Logs',
    description: 'Nova forma de visualizar os logs do sistema em formato de linha do tempo cronológica, com destaque automático para erros e avisos recentes.',
    type: 'feature',
    icon: <GitCommitHorizontal className="h-5 w-5" />,
    highlights: [
      'Agrupamento automático por data',
      'Priorização de erros e avisos recentes',
      'Scroll infinito otimizado para performance',
      'Indicador visual de logs críticos',
      'Expansão de detalhes inline',
    ],
  },
  {
    id: '3',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Otimização de Performance nos Logs',
    description: 'Melhorias significativas de performance na renderização da timeline e tabela de logs.',
    type: 'performance',
    icon: <Gauge className="h-5 w-5" />,
    highlights: [
      'React.memo em componentes pesados',
      'Cache de configurações de status',
      'Redução de animações CSS',
      'useCallback em handlers',
    ],
  },
  {
    id: '4',
    version: '1.2.0',
    date: '22 Jan 2026',
    title: 'Filtro Automático de Logs Repetitivos',
    description: 'Omissão automática de logs de CPF/CNPJ já cadastrado para reduzir poluição visual.',
    type: 'improvement',
    icon: <Filter className="h-5 w-5" />,
    highlights: [
      'Filtro regex para padrões repetitivos',
      'Logs de documentos duplicados são ocultados',
    ],
  },
  // v1.1.0
  {
    id: '5',
    version: '1.1.0',
    date: '21 Jan 2026',
    title: 'Dashboard com Widgets Personalizáveis',
    description: 'Sistema completo de personalização do dashboard com drag-and-drop para reorganizar widgets.',
    type: 'feature',
    icon: <LayoutGrid className="h-5 w-5" />,
    highlights: [
      'Drag and drop nativo para reordenar widgets',
      'Opção de mostrar/ocultar widgets individualmente',
      'Botão de reset para configuração padrão',
      'Configurações salvas automaticamente no localStorage',
      'Feedback visual durante arraste',
    ],
  },
  {
    id: '6',
    version: '1.1.0',
    date: '21 Jan 2026',
    title: 'Sistema de Cache Inteligente',
    description: 'Implementação de cache automático de dados para melhorar a performance e reduzir requisições à API.',
    type: 'performance',
    icon: <Database className="h-5 w-5" />,
    highlights: [
      'Cache de 5 minutos para dados do dashboard',
      'Cache de 3 minutos para logs',
      'Indicador visual de dados em cache',
      'Botão para forçar refresh manual',
      'Timestamp da última atualização',
    ],
  },
  {
    id: '7',
    version: '1.1.0',
    date: '21 Jan 2026',
    title: 'Melhorias na Tabela de Clientes',
    description: 'Aplicação do sistema de cache e melhorias visuais na tabela de clientes.',
    type: 'improvement',
    icon: <Users className="h-5 w-5" />,
    highlights: [
      'Cache integrado com indicador de tempo',
      'Performance otimizada',
    ],
  },
  // v1.0.0
  {
    id: '8',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Nova Interface Visual',
    description: 'Redesign completo da interface com novo sistema de design moderno e suporte a tema escuro.',
    type: 'visual',
    icon: <Palette className="h-5 w-5" />,
    highlights: [
      'Tema claro e escuro com transição suave',
      'Design system com tokens CSS personalizados',
      'Cards com efeito glassmorphism',
      'Gradientes elegantes',
      'Tipografia Inter',
      'Animações com Framer Motion',
    ],
  },
  {
    id: '9',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Dashboard Renovado',
    description: 'Novo dashboard com gráficos interativos e cards de estatísticas redesenhados.',
    type: 'feature',
    icon: <Sparkles className="h-5 w-5" />,
    highlights: [
      'Gráficos de barras e pizza com Recharts',
      'Cards de estatísticas com animações',
      'Filtros por período e status',
      'Modal de detalhes de cancelados',
    ],
  },
  {
    id: '10',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Sistema de Logs Completo',
    description: 'Implementação do sistema de logs com tabela avançada e filtros.',
    type: 'feature',
    icon: <Code className="h-5 w-5" />,
    highlights: [
      'Tabela com ordenação e paginação',
      'Filtros por status, data e busca global',
      'Modal de detalhes do log',
      'Badges coloridos por tipo',
      'Cópia rápida de informações',
    ],
  },
  {
    id: '11',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Sidebar e Header Modernos',
    description: 'Nova estrutura de navegação com sidebar lateral e header com busca global.',
    type: 'visual',
    icon: <LayoutGrid className="h-5 w-5" />,
    highlights: [
      'Sidebar com ícones e navegação',
      'Header fixo com busca global',
      'Menu de perfil com dropdown',
      'Indicadores visuais de página ativa',
    ],
  },
  {
    id: '12',
    version: '1.0.0',
    date: '20 Jan 2026',
    title: 'Segurança e Autenticação',
    description: 'Sistema de autenticação seguro com controle de acesso por perfil.',
    type: 'security',
    icon: <Shield className="h-5 w-5" />,
    highlights: [
      'Login com validação',
      'Controle de sessão',
      'Perfis de administrador e usuário',
      'Rotas protegidas',
    ],
  },
];

const getTypeConfig = (type: ChangelogEntry['type']) => {
  switch (type) {
    case 'feature':
      return { label: 'Novidade', color: 'bg-primary text-primary-foreground', icon: Zap };
    case 'improvement':
      return { label: 'Melhoria', color: 'bg-success text-success-foreground', icon: Sparkles };
    case 'fix':
      return { label: 'Correção', color: 'bg-warning text-warning-foreground', icon: CheckCircle };
    case 'visual':
      return { label: 'Visual', color: 'bg-accent text-accent-foreground', icon: Palette };
    case 'security':
      return { label: 'Segurança', color: 'bg-destructive text-destructive-foreground', icon: Shield };
    case 'performance':
      return { label: 'Performance', color: 'bg-chart-3 text-white', icon: Gauge };
    default:
      return { label: 'Atualização', color: 'bg-secondary text-secondary-foreground', icon: Tag };
  }
};

// Agrupar por versão
const groupByVersion = (entries: ChangelogEntry[]) => {
  const groups: Record<string, { date: string; entries: ChangelogEntry[] }> = {};
  
  entries.forEach(entry => {
    if (!groups[entry.version]) {
      groups[entry.version] = { date: entry.date, entries: [] };
    }
    groups[entry.version].entries.push(entry);
  });
  
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([version, data]) => ({ version, ...data }));
};

export function Changelog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filtrar entries
  const filteredEntries = fullChangelog.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const groupedChangelog = groupByVersion(filteredEntries);

  // Estatísticas
  const stats = {
    total: fullChangelog.length,
    features: fullChangelog.filter(e => e.type === 'feature').length,
    improvements: fullChangelog.filter(e => e.type === 'improvement').length,
    versions: new Set(fullChangelog.map(e => e.version)).size,
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/50 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg shadow-primary/25">
              <Rocket className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Histórico de Atualizações</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe todas as melhorias e novidades do sistema
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-card/50 rounded-xl border border-border/50">
              <p className="text-2xl font-bold text-primary">{stats.versions}</p>
              <p className="text-xs text-muted-foreground">Versões</p>
            </div>
            <div className="text-center px-4 py-2 bg-card/50 rounded-xl border border-border/50">
              <p className="text-2xl font-bold text-success">{stats.features}</p>
              <p className="text-xs text-muted-foreground">Novidades</p>
            </div>
            <div className="text-center px-4 py-2 bg-card/50 rounded-xl border border-border/50">
              <p className="text-2xl font-bold text-accent">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Atualizações</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atualizações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="feature">Novidades</SelectItem>
                <SelectItem value="improvement">Melhorias</SelectItem>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="security">Segurança</SelectItem>
                <SelectItem value="fix">Correções</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-8">
        {groupedChangelog.map((group, groupIndex) => (
          <motion.div
            key={group.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            {/* Version Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">v{group.version}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {group.date}
              </div>
              <Badge variant="secondary">
                {group.entries.length} {group.entries.length === 1 ? 'atualização' : 'atualizações'}
              </Badge>
              <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
            </div>

            {/* Entries */}
            <div className="grid gap-4 md:grid-cols-2">
              {group.entries.map((entry, index) => {
                const typeConfig = getTypeConfig(entry.type);
                
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
                      <CardContent className="p-5">
                        <div className="flex gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary group-hover:from-primary/20 group-hover:to-accent/20 transition-colors h-fit">
                            {entry.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">
                                {entry.title}
                              </h3>
                              <Badge className={`text-xs ${typeConfig.color}`}>
                                {typeConfig.label}
                              </Badge>
                              {entry.breaking && (
                                <Badge variant="destructive" className="text-xs">
                                  Breaking
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4">
                              {entry.description}
                            </p>

                            {entry.highlights && (
                              <ul className="space-y-1.5">
                                {entry.highlights.map((highlight, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                                    <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                                    <span>{highlight}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-secondary/50 rounded-full w-fit mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Nenhuma atualização encontrada</h3>
          <p className="text-sm text-muted-foreground">
            Tente ajustar os filtros de busca
          </p>
        </div>
      )}
    </motion.div>
  );
}