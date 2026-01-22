import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Search, 
  SlidersHorizontal,
  RefreshCw,
  Filter,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface FilterOption {
  id: string
  label: string
  options: { value: string; label: string }[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchableColumns?: string[]
  onRefresh?: () => void
  isLoading?: boolean
  emptyMessage?: string
  filters?: FilterOption[]
  onFilterChange?: (filters: Record<string, string>) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Pesquisar...",
  searchableColumns = [],
  onRefresh,
  isLoading = false,
  emptyMessage = "Nenhum resultado encontrado.",
  filters = [],
  onFilterChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({})
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== 'all').length

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value }
    if (value === 'all' || !value) {
      delete newFilters[filterId]
    }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setGlobalFilter("")
    onFilterChange?.({})
  }

  const globalFilterFn = React.useCallback(
    (row: Row<TData>, _columnId: string, filterValue: string): boolean => {
      if (!filterValue) return true
      const searchValue = filterValue.toLowerCase().trim()
      if (!searchValue) return true

      if (searchableColumns.length > 0) {
        return searchableColumns.some(column => {
          const value = row.getValue(column)
          if (value == null) return false
          return String(value).toLowerCase().includes(searchValue)
        })
      }

      return columns.some(col => {
        const columnId = (col as any).accessorKey || (col as any).id
        if (!columnId) return false
        const value = row.getValue(columnId)
        if (value == null) return false
        return String(value).toLowerCase().includes(searchValue)
      })
    },
    [columns, searchableColumns]
  )

  // Apply custom filters to data
  const filteredData = React.useMemo(() => {
    if (Object.keys(activeFilters).length === 0) return data

    return data.filter((row: any) => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value || value === 'all') return true
        const rowValue = row[key]
        if (rowValue == null) return false
        return String(rowValue).toLowerCase().includes(value.toLowerCase())
      })
    })
  }, [data, activeFilters])

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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  React.useEffect(() => {
    table.setPageIndex(0)
  }, [globalFilter, table, activeFilters])

  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalRows = table.getFilteredRowModel().rows.length
  const pageSize = table.getState().pagination.pageSize
  const startRow = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endRow = Math.min(currentPage * pageSize, totalRows)

  return (
    <div className="space-y-4">
      {/* Advanced Filters Bar */}
      <div className="p-4 bg-card rounded-xl border border-border shadow-card space-y-4">
        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 bg-background border-border focus:ring-2 focus:ring-primary/20"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Button */}
            {filters.length > 0 && (
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 relative"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-popover border border-border z-50" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">Filtros Avançados</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Limpar todos
                        </Button>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      {filters.map((filter) => (
                        <div key={filter.id} className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {filter.label}
                          </label>
                          <Select
                            value={activeFilters[filter.id] || "all"}
                            onValueChange={(value) => handleFilterChange(filter.id, value)}
                          >
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder={`Selecionar ${filter.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              <SelectItem value="all">Todos</SelectItem>
                              {filter.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          clearAllFilters()
                          setIsFilterOpen(false)
                        }}
                      >
                        Limpar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setIsFilterOpen(false)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
                <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {(activeFilterCount > 0 || globalFilter) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Filtros ativos:</span>
            
            {globalFilter && (
              <Badge 
                variant="secondary" 
                className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                onClick={() => setGlobalFilter("")}
              >
                Busca: "{globalFilter}"
                <X className="h-3 w-3" />
              </Badge>
            )}
            
            {Object.entries(activeFilters).map(([key, value]) => {
              const filter = filters.find(f => f.id === key)
              const option = filter?.options.find(o => o.value === value)
              return (
                <Badge 
                  key={key}
                  variant="secondary" 
                  className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleFilterChange(key, 'all')}
                >
                  {filter?.label}: {option?.label || value}
                  <X className="h-3 w-3" />
                </Badge>
              )
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar todos
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-secondary/30 hover:bg-secondary/30">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className="font-semibold text-foreground/80 h-12"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`
                    transition-colors duration-150 
                    hover:bg-primary/5
                    ${index % 2 === 0 ? 'bg-card' : 'bg-secondary/10'}
                  `}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5">
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
                    <p>{emptyMessage}</p>
                    {(globalFilter || activeFilterCount > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {totalRows > 0 
              ? `Mostrando ${startRow} a ${endRow} de ${totalRows} itens`
              : 'Nenhum item encontrado'
            }
          </span>
          <div className="flex items-center gap-2">
            <span>Itens por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {[5, 10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              let pageNum: number
              if (pageCount <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= pageCount - 2) {
                pageNum = pageCount - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.setPageIndex(pageNum - 1)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
