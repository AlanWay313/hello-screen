import { LayoutGrid, Maximize2, Minimize2, BarChart3, List } from 'lucide-react';
import { useState } from 'react';
import { TotalClientes } from '../charts/totalClientes';
import { ClientesCancelados } from '../charts/clientesCancelados';
import { AtivoInativos } from '../charts/ativosInativos';

export function Dashboard() {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'wide'>('grid');
  const [isExpanded, setIsExpanded] = useState(false);

  const chartComponents = [
    { 
      id: 'total-clientes', 
      component: TotalClientes, 
      title: 'Total de Clientes',
      category: 'clientes',
    },
    { 
      id: 'clientes-cancelados', 
      component: ClientesCancelados, 
      title: 'Clientes Cancelados',
      category: 'cancelamentos',
    },
    { 
      id: 'ativo-inativos', 
      component: AtivoInativos, 
      title: 'Ativos/Inativos',
      category: 'status',
    },
  ];

  const getGridClasses = () => {
    switch (viewMode) {
      case 'list':
        return 'flex flex-col gap-4';
      case 'wide':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
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
    <div className={`${isExpanded ? 'min-h-screen' : ''} transition-all duration-300`}>
      {/* Dashboard Header */}
      <div className="mb-6 p-5 bg-card rounded-2xl shadow-card border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Dashboard Analytics</h2>
              <p className="text-sm text-muted-foreground">Visão geral dos seus dados</p>
            </div>
          </div>

          {/* View Controls */}
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
            <span className="text-xs text-muted-foreground">{chartComponents.length} componentes ativos</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={`${getGridClasses()} transition-all duration-300`}>
        {chartComponents.map(({ id, component: Component, category }) => (
          <div
            key={id}
            className={`
              group relative transition-all duration-300 hover:z-10 animate-fade-in
              ${viewMode === 'list' ? 'w-full' : ''}
              ${viewMode === 'wide' ? 'min-h-[400px]' : 'min-h-[320px]'}
            `}
          >
            {/* Category Badge on Hover */}
            <div className="absolute -top-2 left-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-1">
              <span className={`
                px-2.5 py-1 text-xs rounded-full font-medium shadow-sm
                ${category === 'clientes' ? 'bg-primary/10 text-primary border border-primary/20' : ''}
                ${category === 'cancelamentos' ? 'bg-destructive/10 text-destructive border border-destructive/20' : ''}
                ${category === 'status' ? 'bg-success/10 text-success border border-success/20' : ''}
              `}>
                {category}
              </span>
            </div>

            <Component />
          </div>
        ))}
      </div>
    </div>
  );
}
