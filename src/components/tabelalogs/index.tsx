import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  RotateCw, 
  Search,
  Filter,
  Eye,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CheckCircle,
  X,
  CalendarDays,
  FileText,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  Info,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { Loading } from "../loading";
import api from "@/services/api";
import useIntegrador from "@/hooks/use-integrador";

// Interface para o tipo de log
interface LogData {
  id_cliente: string;
  codeLog: string;
  title: string;
  acao: string;
  created_at: string;
  [key: string]: any;
}

// Interface para filtros de data
interface DateFilters {
  startDate: string;
  endDate: string;
  datePreset: string;
}

// Interface para estatísticas
interface LogStats {
  total: number;
  error: number;
  warning: number;
  success: number;
  info: number;
}

// Modal customizado com suporte a dark mode
const CustomModal = ({ 
  isOpen, 
  onClose, 
  children,
  title,
  description,
  maxWidth = "max-w-4xl"
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  description?: string;
  maxWidth?: string;
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className={`bg-card border border-border rounded-2xl shadow-elevated ${maxWidth} w-full max-h-[85vh] overflow-hidden animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Detalhes
const LogDetailsModal = ({ 
  isOpen, 
  onClose, 
  logData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  logData: LogData | null; 
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  if (!logData) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Log"
      description="Informações completas sobre o registro"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge status={logData.codeLog} size="lg" />
          <span className="text-sm text-muted-foreground">
            {formatDateTime(logData.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary/30 rounded-xl border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Documento</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg text-foreground">{logData.id_cliente}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(logData.id_cliente)}
                className="h-8 w-8"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-xl border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Data/Hora</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{formatDateTime(logData.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/30 rounded-xl border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Título</p>
          <p className="text-foreground font-medium">{logData.title}</p>
        </div>

        <div className="p-4 bg-secondary/30 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(logData.acao)}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Copiar
            </Button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed font-mono bg-background/50 p-4 rounded-lg border border-border">
            {logData.acao}
          </pre>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => copyToClipboard(JSON.stringify(logData, null, 2))} className="gap-2">
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copiar JSON
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};

// Componente para badge de status
const StatusBadge = ({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'error':
        return { 
          bg: 'bg-destructive/10 border-destructive/20', 
          text: 'text-destructive', 
          icon: AlertCircle,
          label: 'Erro' 
        };
      case 'success':
        return { 
          bg: 'bg-success/10 border-success/20', 
          text: 'text-success', 
          icon: CheckCircle,
          label: 'Sucesso' 
        };
      case 'warning':
        return { 
          bg: 'bg-warning/10 border-warning/20', 
          text: 'text-warning', 
          icon: AlertTriangle,
          label: 'Aviso' 
        };
      case 'info':
        return { 
          bg: 'bg-primary/10 border-primary/20', 
          text: 'text-primary', 
          icon: Info,
          label: 'Info' 
        };
      default:
        return { 
          bg: 'bg-secondary border-border', 
          text: 'text-muted-foreground', 
          icon: Activity,
          label: status 
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline"
      className={`${config.bg} ${config.text} border gap-1.5 font-medium ${size === 'lg' ? 'px-3 py-1.5 text-sm' : ''}`}
    >
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
      {config.label}
    </Badge>
  );
};

// Componente de estatísticas redesenhado
const LogStatsCards = ({ stats }: { stats: LogStats }) => {
  const statItems = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'primary' },
    { label: 'Erros', value: stats.error, icon: AlertCircle, color: 'destructive' },
    { label: 'Avisos', value: stats.warning, icon: AlertTriangle, color: 'warning' },
    { label: 'Sucessos', value: stats.success, icon: CheckCircle, color: 'success' },
    { label: 'Info', value: stats.info, icon: Info, color: 'primary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className={`border-${item.color}/20 bg-${item.color}/5 hover:bg-${item.color}/10 transition-colors`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${item.color}/10`}>
                  <Icon className={`h-4 w-4 text-${item.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Componente de filtros avançados
const AdvancedFilters = ({ 
  dateFilters, 
  setDateFilters, 
  globalFilter, 
  setGlobalFilter,
  onClearFilters
}: {
  dateFilters: DateFilters;
  setDateFilters: (filters: DateFilters) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
  onClearFilters: () => void;
}) => {
  const getDatePresets = () => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return {
      today: { start: formatDate(today), end: formatDate(today) },
      yesterday: { start: formatDate(yesterday), end: formatDate(yesterday) },
      lastWeek: { start: formatDate(lastWeek), end: formatDate(today) },
      lastMonth: { start: formatDate(lastMonth), end: formatDate(today) },
    };
  };

  const presets = getDatePresets();

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setDateFilters({ ...dateFilters, datePreset: preset });
      return;
    }
    if (preset === 'all') {
      setDateFilters({ startDate: '', endDate: '', datePreset: preset });
      return;
    }
    const presetData = presets[preset as keyof typeof presets];
    if (presetData) {
      setDateFilters({
        startDate: presetData.start,
        endDate: presetData.end,
        datePreset: preset
      });
    }
  };

  const activeFilterCount = [dateFilters.startDate, dateFilters.endDate, globalFilter].filter(Boolean).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border border-border z-50" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Filtros Avançados</h4>
            <Button variant="ghost" size="icon" onClick={onClearFilters} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Busca Global</Label>
              <Input
                placeholder="Buscar em todos os campos..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="mt-1.5 bg-background"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Período</Label>
              <Select value={dateFilters.datePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="lastWeek">Última semana</SelectItem>
                  <SelectItem value="lastMonth">Último mês</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilters.datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Data inicial</Label>
                  <Input
                    type="date"
                    value={dateFilters.startDate}
                    onChange={(e) => setDateFilters({ ...dateFilters, startDate: e.target.value })}
                    className="mt-1 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data final</Label>
                  <Input
                    type="date"
                    value={dateFilters.endDate}
                    onChange={(e) => setDateFilters({ ...dateFilters, endDate: e.target.value })}
                    className="mt-1 bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function TabelaLogs() {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "created_at", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<LogData[]>([]);
  const [filteredData, setFilteredData] = React.useState<LogData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<LogData | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dateFilters, setDateFilters] = React.useState<DateFilters>({
    startDate: '',
    endDate: '',
    datePreset: ''
  });
  const [globalFilter, setGlobalFilter] = React.useState('');
  
  const integrador: any = useIntegrador();

  const openLogDetails = (logData: LogData) => {
    setSelectedLog(logData);
    setIsModalOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateStats = (data: LogData[]): LogStats => ({
    total: data.length,
    error: data.filter(item => item.codeLog?.toLowerCase() === 'error').length,
    warning: data.filter(item => item.codeLog?.toLowerCase() === 'warning').length,
    success: data.filter(item => item.codeLog?.toLowerCase() === 'success').length,
    info: data.filter(item => item.codeLog?.toLowerCase() === 'info').length,
  });

  const applyFilters = React.useCallback((data: LogData[]) => {
    let filtered = [...data];

    if (dateFilters.startDate) {
      const [year, month, day] = dateFilters.startDate.split('-').map(Number);
      const startDate = new Date(year, month - 1, day);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= startDate;
      });
    }

    if (dateFilters.endDate) {
      const [year, month, day] = dateFilters.endDate.split('-').map(Number);
      const endDate = new Date(year, month - 1, day, 23, 59, 59);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate <= endDate;
      });
    }

    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }

    return filtered;
  }, [dateFilters, globalFilter]);

  React.useEffect(() => {
    setFilteredData(applyFilters(data));
  }, [data, applyFilters]);

  const clearAllFilters = () => {
    setDateFilters({ startDate: '', endDate: '', datePreset: '' });
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const columns = React.useMemo(() => [
    {
      accessorKey: "id_cliente",
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent gap-1"
        >
          Documento
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: any) => (
        <Badge variant="secondary" className="font-mono">
          {row.getValue("id_cliente")}
        </Badge>
      ),
    },
    {
      accessorKey: "codeLog",
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent gap-1"
        >
          Status
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: any) => <StatusBadge status={row.getValue("codeLog") || 'info'} />,
    },
    {
      accessorKey: "title",
      header: () => <span className="font-semibold">Título</span>,
      cell: ({ row }: any) => (
        <span className="font-medium text-foreground max-w-[200px] truncate block" title={row.getValue("title")}>
          {row.getValue("title")}
        </span>
      ),
    },
    {
      accessorKey: "acao",
      header: () => <span className="font-semibold">Descrição</span>,
      cell: ({ row }: any) => (
        <span className="text-muted-foreground max-w-[250px] truncate block" title={row.getValue("acao")}>
          {row.getValue("acao")}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent gap-1"
        >
          <Clock className="h-3 w-3" />
          Data
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-popover border border-border z-50">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div 
              className="flex items-center px-2 py-1.5 text-sm hover:bg-secondary cursor-pointer rounded-sm"
              onClick={() => openLogDetails(row.original)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  async function handleClientes() {
    setRefreshing(true);
    setLoading(true);
    try {
      const result = await api.get("/src/services/LogsDistintosClientes.php", { params: { idIntegra: integrador } });
      setData(result.data.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    handleClientes();
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: 15 } },
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  const stats = calculateStats(filteredData);
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalRows = table.getFilteredRowModel().rows.length;

  if (loading && !refreshing) return <Loading />;

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <LogStatsCards stats={stats} />

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por documento..."
                  value={(table.getColumn("id_cliente")?.getFilterValue() as string) ?? ""}
                  onChange={(e) => table.getColumn("id_cliente")?.setFilterValue(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>

              <Select
                onValueChange={(value) => table.getColumn("codeLog")?.setFilterValue(value === "all" ? undefined : value)}
              >
                <SelectTrigger className="w-[160px] bg-background">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <AdvancedFilters
                dateFilters={dateFilters}
                setDateFilters={setDateFilters}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                onClearFilters={clearAllFilters}
              />

              <Button variant="outline" size="sm" onClick={handleClientes} disabled={refreshing} className="gap-2">
                <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Colunas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
                  <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "id_cliente" ? "Documento" :
                       column.id === "codeLog" ? "Status" :
                       column.id === "title" ? "Título" :
                       column.id === "acao" ? "Descrição" :
                       column.id === "created_at" ? "Data" : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Active Filters */}
          {(dateFilters.startDate || dateFilters.endDate || globalFilter || columnFilters.length > 0) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">Filtros:</span>
              {globalFilter && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setGlobalFilter('')}>
                  Busca: "{globalFilter}" <X className="h-3 w-3" />
                </Badge>
              )}
              {dateFilters.startDate && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setDateFilters({...dateFilters, startDate: ''})}>
                  Início: {new Date(dateFilters.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} <X className="h-3 w-3" />
                </Badge>
              )}
              {dateFilters.endDate && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setDateFilters({...dateFilters, endDate: ''})}>
                  Fim: {new Date(dateFilters.endDate + 'T12:00:00').toLocaleDateString('pt-BR')} <X className="h-3 w-3" />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                Limpar todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-secondary/30 hover:bg-secondary/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-foreground/80 h-12">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow 
                  key={row.id} 
                  className={`transition-colors hover:bg-primary/5 ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/10'}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-50" />
                    <p>Nenhum resultado encontrado</p>
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Limpar filtros
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-secondary/20">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {totalRows > 0 
                ? `Mostrando ${(currentPage - 1) * table.getState().pagination.pageSize + 1} a ${Math.min(currentPage * table.getState().pagination.pageSize, totalRows)} de ${totalRows}`
                : 'Nenhum registro'
              }
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {[10, 15, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {currentPage} de {pageCount || 1}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal */}
      <LogDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} logData={selectedLog} />
    </div>
  );
}
