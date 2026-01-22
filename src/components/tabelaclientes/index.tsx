import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Mail, Phone, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import useIntegrador from "@/hooks/use-integrador"
import ResetSenha from "../resetsenha"
import EditarCliente from "../editarcliente"
import ReintegrarCliente from "../reintegrarcliente"
import { Loading } from "../loading"
import api from "@/services/api"

interface Cliente {
  nome: string
  email: string
  ole_contract_number: string
  cpf_cnpj: string
  contato: string
  endereco_logradouro: string
  endereco_cep: string
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
        <DropdownMenuContent align="end" className="w-48">
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
        <span className="font-medium text-foreground">{row.getValue("nome")}</span>
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
    id: "actions",
    header: () => <div className="text-center font-semibold">Ações</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <ActionsCell row={row} refetch={() => {}} />
      </div>
    ),
  },
]

export function TabelaDeClientes() {
  const [data, setData] = React.useState<Cliente[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const integrador = useIntegrador()

  const fetchClientes = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await api.get(
        "/src/clientes/listarclientes.php",
        { params: { idIntegra: integrador } }
      )

      setData(result.data.data || [])
    } catch (err) {
      console.error("Erro ao buscar clientes:", err)
      setError("Erro ao carregar clientes. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [integrador])

  React.useEffect(() => {
    if (integrador) {
      fetchClientes()
    }
  }, [fetchClientes, integrador])

  const columns = React.useMemo(() => getColumns(fetchClientes), [fetchClientes])

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive text-center">{error}</p>
        <Button onClick={fetchClientes} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Pesquisar por nome, email, documento ou contrato..."
      searchableColumns={["nome", "email", "cpf_cnpj", "ole_contract_number", "contato"]}
      onRefresh={fetchClientes}
      isLoading={loading}
      emptyMessage="Nenhum cliente encontrado."
    />
  )
}
