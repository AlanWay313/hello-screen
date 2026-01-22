import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Mail, Phone, MapPin, FileText, UserCheck, UserX, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DataTable, FilterOption } from "@/components/ui/data-table"
import useIntegrador from "@/hooks/use-integrador"
import { useCachedData } from "@/hooks/use-cached-data"
import ResetSenha from "../resetsenha"
import EditarCliente from "../editarcliente"
import ReintegrarCliente from "../reintegrarcliente"
import { ClientesPageSkeleton } from "@/components/ui/skeleton"
import api from "@/services/api"

interface Cliente {
  nome: string
  email: string
  ole_contract_number: string
  cpf_cnpj: string
  contato: string
  endereco_logradouro: string
  endereco_cep: string
  status?: string
  estado?: string
  cidade?: string
  data_cadastro?: string
}

const ActionsCell = React.memo(
  ({ row, refetch }: { row: any; refetch: () => void }) => {
    const contrato = row.original.ole_contract_number
    const email = row.original.email
    const nome = row.original.nome
    const rowData = row.original

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover border border-border z-50">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ResetSenha contratoCliente={contrato} emailCliente={email} />
          <EditarCliente data={rowData} listarClientes={refetch} />
          <ReintegrarCliente nome={nome} />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

ActionsCell.displayName = "ActionsCell"

const getColumns = (_refetch: () => void): ColumnDef<Cliente>[] => [
  {
    accessorKey: "nome",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent gap-1"
      >
        Nome
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">
            {(row.getValue("nome") as string)?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.getValue("nome")}</span>
          {row.original.status && (
            <span className={`text-xs ${row.original.status === 'ativo' ? 'text-success' : 'text-muted-foreground'}`}>
              {row.original.status === 'ativo' ? '● Ativo' : '○ Inativo'}
            </span>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-semibold hover:bg-transparent gap-1"
      >
        <Mail className="h-3 w-3" />
        Email
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <a 
        href={`mailto:${row.getValue("email")}`}
        className="text-primary hover:text-primary/80 hover:underline transition-colors"
      >
        {row.getValue("email")}
      </a>
    ),
  },
  {
    accessorKey: "ole_contract_number",
    header: () => (
      <div className="flex items-center gap-1 font-semibold">
        <FileText className="h-3 w-3" />
        Contrato
      </div>
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono">
        {row.getValue("ole_contract_number")}
      </Badge>
    ),
  },
  {
    accessorKey: "cpf_cnpj",
    header: "Documento",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.getValue("cpf_cnpj")}
      </span>
    ),
  },
  {
    accessorKey: "contato",
    header: () => (
      <div className="flex items-center gap-1 font-semibold">
        <Phone className="h-3 w-3" />
        Contato
      </div>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("contato")}</span>
    ),
  },
  {
    accessorKey: "endereco_logradouro",
    header: () => (
      <div className="flex items-center gap-1 font-semibold">
        <MapPin className="h-3 w-3" />
        Endereço
      </div>
    ),
    cell: ({ row }) => (
      <div 
        className="max-w-[180px] truncate text-muted-foreground"
        title={row.getValue("endereco_logradouro")}
      >
        {row.getValue("endereco_logradouro")}
      </div>
    ),
  },
  {
    accessorKey: "endereco_cep",
    header: "CEP",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.getValue("endereco_cep")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          variant={status === 'ativo' ? 'default' : 'secondary'}
          className={status === 'ativo' ? 'bg-success/10 text-success border-success/20' : ''}
        >
          {status === 'ativo' ? (
            <><UserCheck className="h-3 w-3 mr-1" /> Ativo</>
          ) : (
            <><UserX className="h-3 w-3 mr-1" /> Inativo</>
          )}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center font-semibold">Ações</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <ActionsCell row={row} refetch={() => {}} />
      </div>
    ),
  },
]

// Define available filters
const clienteFilters: FilterOption[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "ativo", label: "Ativos" },
      { value: "inativo", label: "Inativos" },
    ],
  },
  {
    id: "estado",
    label: "Estado",
    options: [
      { value: "SP", label: "São Paulo" },
      { value: "RJ", label: "Rio de Janeiro" },
      { value: "MG", label: "Minas Gerais" },
      { value: "RS", label: "Rio Grande do Sul" },
      { value: "PR", label: "Paraná" },
      { value: "SC", label: "Santa Catarina" },
      { value: "BA", label: "Bahia" },
      { value: "GO", label: "Goiás" },
      { value: "DF", label: "Distrito Federal" },
      { value: "PE", label: "Pernambuco" },
      { value: "CE", label: "Ceará" },
    ],
  },
  {
    id: "tipo_documento",
    label: "Tipo de Documento",
    options: [
      { value: "cpf", label: "CPF (Pessoa Física)" },
      { value: "cnpj", label: "CNPJ (Pessoa Jurídica)" },
    ],
  },
]

export function TabelaDeClientes() {
  const integrador = useIntegrador()

  const fetchClientes = React.useCallback(async () => {
    const result = await api.get(
      "/src/clientes/listarclientes.php",
      { params: { idIntegra: integrador } }
    )

    // Add status field based on existing data
    const clientesWithStatus = (result.data.data || []).map((cliente: any) => ({
      ...cliente,
      status: cliente.email ? 'ativo' : 'inativo',
      tipo_documento: cliente.cpf_cnpj?.length > 14 ? 'cnpj' : 'cpf',
    }))

    return clientesWithStatus
  }, [integrador])

  const { 
    data, 
    isLoading, 
    error, 
    refresh, 
    lastUpdated,
    isCached 
  } = useCachedData<Cliente[]>(fetchClientes, {
    cacheKey: `clientes-${integrador}`,
    cacheTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!integrador,
  })

  const columns = React.useMemo(() => getColumns(refresh), [refresh])

  const handleFilterChange = React.useCallback((filters: Record<string, string>) => {
    console.log("Filtros aplicados:", filters)
  }, [])

  // Formatar tempo desde última atualização
  const formatLastUpdated = () => {
    if (!lastUpdated) return null
    const diff = Date.now() - lastUpdated.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "agora"
    if (minutes === 1) return "1 min atrás"
    return `${minutes} min atrás`
  }

  if (isLoading && !data) {
    return <ClientesPageSkeleton />
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive text-center">{error.message}</p>
        <Button onClick={refresh} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cache indicator */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Atualizado {formatLastUpdated()}
            {isCached && " (cache)"}
          </span>
        </div>
      )}
      
      <DataTable
        columns={columns}
        data={data || []}
        searchPlaceholder="Pesquisar por nome, email, documento ou contrato..."
        searchableColumns={["nome", "email", "cpf_cnpj", "ole_contract_number", "contato"]}
        onRefresh={refresh}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        filters={clienteFilters}
        onFilterChange={handleFilterChange}
      />
    </div>
  )
}
