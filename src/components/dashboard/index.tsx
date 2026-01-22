import { LayoutGrid, Maximize2, Minimize2, BarChart3, List, RefreshCw, Download, ChevronDown, Users, UserCheck, UserX, XCircle, Settings2, GripVertical, Eye, EyeOff, RotateCcw, ChevronUp, ChevronDown as ChevronDownIcon, Move } from 'lucide-react';
import { useState, useCallback, DragEvent } from 'react';
import { StatsOverview } from './stats-overview';
import { ClientsChart } from './charts/clients-chart';
import { StatusPieChart } from './charts/status-pie-chart';
import { WeeklyBarChart } from './charts/bar-chart';
import { Button } from '@/components/ui/button';
import { DashboardFiltersBar } from './dashboard-filters-bar';
import { DashboardFilters, defaultFilters } from './dashboard-filters-context';
import { ListarTodosClientes } from '@/services/listarTodosClientes';
import useIntegrador from '@/hooks/use-integrador';
import { exportToCSV, clienteExportColumns } from '@/lib/export-utils';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type ExportType = 'todos' | 'ativos' | 'inativos' | 'cancelados';

export function Dashboard() {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'wide'>('grid');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const integrador = useIntegrador();
  
  const { 
    widgets, 
    visibleWidgets, 
    toggleWidget, 
    moveWidget, 
    resetLayout,
    draggedWidget,
    dragOverWidget,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragLeave,
  } = useDashboardLayout();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Formatar status do cliente
  const formatarStatus = (cliente: any): string => {
    if (!cliente.ole_contract_number || cliente.ole_contract_number.toString().trim() === '') {
      return 'Sem Contrato';
    }
    if (!cliente.voalle_contract_status || cliente.voalle_contract_status.trim() === '') {
      return 'Sem Status';
    }
    const status = cliente.voalle_contract_status.toLowerCase();
    if (status === 'normal') return 'Ativo';
    if (status === 'cancelado') return 'Cancelado';
    return cliente.voalle_contract_status;
  };

  const handleExport = async (type: ExportType) => {
    if (!integrador) return;
    
    setIsExporting(true);
    try {
      const clientes = await ListarTodosClientes(integrador);
      if (!clientes || clientes.length === 0) {
        alert('Não há dados para exportar.');
        return;
      }

      let filteredClientes = clientes;
      let filename = 'clientes';

      switch (type) {
        case 'ativos':
          filteredClientes = clientes.filter((c: any) => 
            c.voalle_contract_status?.toLowerCase() === 'normal'
          );
          filename = 'clientes_ativos';
          break;
        case 'inativos':
          filteredClientes = clientes.filter((c: any) => 
            !c.ole_contract_number || c.ole_contract_number.toString().trim() === ''
          );
          filename = 'clientes_inativos';
          break;
        case 'cancelados':
          filteredClientes = clientes.filter((c: any) => 
            c.voalle_contract_status?.toLowerCase() === 'cancelado'
          );
          filename = 'clientes_cancelados';
          break;
        default:
          filename = 'clientes_todos';
      }

      const clientesFormatados = filteredClientes.map((c: any) => ({
        ...c,
        voalle_contract_status: formatarStatus(c)
      }));

      if (clientesFormatados.length > 0) {
        exportToCSV(clientesFormatados, filename, clienteExportColumns);
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

  const renderWidget = (widgetId: string, isDraggable: boolean = false) => {
    const isDragging = draggedWidget === widgetId;
    const isDragOver = dragOverWidget === widgetId;
    
    const dragProps = isDraggable ? {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        handleDragStart(widgetId);
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        handleDragOver(widgetId);
      },
      onDragLeave: handleDragLeave,
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        handleDragEnd();
      },
      onDragEnd: handleDragEnd,
    } : {};

    const wrapperClasses = isDraggable ? `
      relative group cursor-move transition-all duration-200
      ${isDragging ? 'opacity-50 scale-95' : ''}
      ${isDragOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
    ` : '';

    const content = (() => {
      switch (widgetId) {
        case 'stats':
          return <StatsOverview key={`stats-${refreshKey}`} filters={filters} />;
        case 'clients-chart':
          return (
            <div className={viewMode === 'grid' ? 'lg:col-span-2' : ''}>
              <ClientsChart key={`clients-${refreshKey}`} filters={filters} />
            </div>
          );
        case 'status-pie':
          return <StatusPieChart key={`pie-${refreshKey}`} filters={filters} />;
        case 'weekly-bar':
          return (
            <div className={viewMode === 'grid' ? 'xl:col-span-2' : ''}>
              <WeeklyBarChart key={`bar-${refreshKey}`} filters={filters} />
            </div>
          );
        default:
          return null;
      }
    })();

    if (!isDraggable) return content;

    return (
      <div {...dragProps} className={wrapperClasses}>
        {/* Drag Handle Indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium shadow-lg">
            <Move className="h-3 w-3" />
            Arraste para reordenar
          </div>
        </div>
        {content}
      </div>
    );
  };

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
            {/* Widget Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Personalizar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Widgets do Dashboard</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetLayout}
                      className="h-7 px-2 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resetar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostre/oculte e reordene os widgets
                  </p>
                </div>
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {widgets.map((widget, index) => (
                    <div
                      key={widget.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        widget.visible ? 'bg-primary/5' : 'bg-muted/50'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={`flex-1 text-sm ${!widget.visible ? 'text-muted-foreground' : ''}`}>
                        {widget.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveWidget(widget.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveWidget(widget.id, 'down')}
                          disabled={index === widgets.length - 1}
                        >
                          <ChevronDownIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleWidget(widget.id)}
                        >
                          {widget.visible ? (
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className={`h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Exportar CSV</span>
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
              <span className="hidden sm:inline">Atualizar</span>
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-accent"></span>
            {visibleWidgets.length} de {widgets.length} widgets visíveis
          </div>
        </div>
      </div>

      {/* Widgets renderizados dinamicamente */}
      {visibleWidgets.map(widget => {
        if (widget.id === 'stats') {
          return <div key={widget.id}>{renderWidget(widget.id, true)}</div>;
        }
        return null;
      })}

      {/* Charts Grid */}
      <div className={`
        grid gap-6 transition-all duration-300
        ${viewMode === 'list' ? 'grid-cols-1' : ''}
        ${viewMode === 'wide' ? 'grid-cols-1 lg:grid-cols-2' : ''}
        ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : ''}
      `}>
        {visibleWidgets.filter(w => w.id !== 'stats').map(widget => (
          <div key={widget.id}>
            {renderWidget(widget.id, true)}
          </div>
        ))}
      </div>
    </div>
  );
}
