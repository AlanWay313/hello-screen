import { LayoutGrid, Maximize2, Minimize2, BarChart3, List, RefreshCw, Download, ChevronDown, Users, UserCheck, UserX, XCircle } from 'lucide-react';
import { useState } from 'react';
import { StatsOverview } from './stats-overview';
import { ClientsChart } from './charts/clients-chart';
import { StatusPieChart } from './charts/status-pie-chart';
import { WeeklyBarChart } from './charts/bar-chart';
import { Button } from '@/components/ui/button';
import { DashboardFiltersBar } from './dashboard-filters-bar';
import { DashboardFilters, defaultFilters } from './dashboard-filters-context';
import { ClientesCanceladosApi } from '@/services/clientesCancelados';
import useIntegrador from '@/hooks/use-integrador';
import { exportToCSV, clienteExportColumns } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ExportType = 'todos' | 'ativos' | 'inativos' | 'cancelados';

export function Dashboard() {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'wide'>('grid');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const integrador = useIntegrador();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = async (type: ExportType) => {
    if (!integrador) return;
    
    setIsExporting(true);
    try {
      const clientes = await ClientesCanceladosApi(integrador);
      if (!clientes || clientes.length === 0) {
        alert('Não há dados para exportar.');
        return;
      }

      let filteredClientes = clientes;
      let filename = 'clientes';

      switch (type) {
        case 'ativos':
          filteredClientes = clientes.filter((c: any) => c.ole_contract_number);
          filename = 'clientes_ativos';
          break;
        case 'inativos':
          filteredClientes = clientes.filter((c: any) => !c.ole_contract_number);
          filename = 'clientes_inativos';
          break;
        case 'cancelados':
          filteredClientes = clientes.filter((c: any) => c.voalle_contract_status === 'cancelado');
          filename = 'clientes_cancelados';
          break;
        default:
          filename = 'clientes_todos';
      }

      if (filteredClientes.length > 0) {
        exportToCSV(filteredClientes, filename, clienteExportColumns);
      } else {
        alert('Não há dados para exportar com o filtro selecionado.');
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      alert('Erro ao exportar dados.');
    } finally {
      setIsExporting(false);
    }
  };

  const ViewModeButton = ({ 
    mode, 
    icon: Icon, 
    title 
  }: { 
    mode: 'grid' | 'list' | 'wide'; 
    icon: typeof LayoutGrid; 
    title: string;
  }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${viewMode === mode 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }
      `}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className={`space-y-6 ${isExpanded ? 'min-h-screen' : ''} transition-all duration-300`}>
      {/* Dashboard Header */}
      <div className="p-5 bg-card rounded-2xl shadow-card border border-border animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Dashboard Analytics</h2>
              <p className="text-sm text-muted-foreground">Visão geral dos seus dados em tempo real</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className={`h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                  Exportar CSV
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                <DropdownMenuItem onClick={() => handleExport('todos')} className="gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Todos os Clientes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('ativos')} className="gap-2 cursor-pointer">
                  <UserCheck className="h-4 w-4 text-success" />
                  Apenas Ativos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('inativos')} className="gap-2 cursor-pointer">
                  <UserX className="h-4 w-4 text-warning" />
                  Apenas Inativos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('cancelados')} className="gap-2 cursor-pointer">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Apenas Cancelados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
              <ViewModeButton mode="grid" icon={LayoutGrid} title="Grade" />
              <ViewModeButton mode="wide" icon={Maximize2} title="Amplo" />
              <ViewModeButton mode="list" icon={List} title="Lista" />
              
              <div className="w-px h-6 bg-border mx-1" />
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  ${isExpanded 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
                title={isExpanded ? "Modo Normal" : "Expandir"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-4 pt-4 border-t border-border">
          <DashboardFiltersBar filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Status Indicators */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs text-muted-foreground">Sistema online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            <span className="text-xs text-muted-foreground">Dados atualizados</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsOverview filters={filters} />

      {/* Charts Grid */}
      <div className={`
        grid gap-6 transition-all duration-300
        ${viewMode === 'list' ? 'grid-cols-1' : ''}
        ${viewMode === 'wide' ? 'grid-cols-1 lg:grid-cols-2' : ''}
        ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : ''}
      `}>
        <div className={viewMode === 'grid' ? 'lg:col-span-2' : ''}>
          <ClientsChart filters={filters} />
        </div>
        
        <StatusPieChart filters={filters} />
        
        <div className={viewMode === 'grid' ? 'xl:col-span-2' : ''}>
          <WeeklyBarChart filters={filters} />
        </div>
      </div>
    </div>
  );
}
