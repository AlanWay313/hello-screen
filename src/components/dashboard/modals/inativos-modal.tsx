import { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, UserX, Eye, RefreshCw, FileText, Mail } from "lucide-react"
import useIntegrador from "@/hooks/use-integrador"
import api from "@/services/api"
import LogIndividual from "@/components/logindividual"
import ReintegrarCliente from "@/components/reintegrarcliente"

interface InativosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InativosModal({ open, onOpenChange }: InativosModalProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState("")
  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const integra = useIntegrador()

  const fetchClientes = async () => {
    if (!integra) return
    
    setLoading(true)
    try {
      const result = await api.get("/src/clientes/listarclientes.php", {
        params: { idIntegra: integra },
      })

      // Clientes inativos = sem contrato ole
      const clientesInativos = result.data.data.filter(
        (cliente: any) =>
          !cliente.ole_contract_number || cliente.ole_contract_number.trim() === ""
      )

      setData(clientesInativos)
    } catch (error) {
      console.error("Erro ao buscar clientes inativos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchClientes()
    }
  }, [integra, open])

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return data

    const termoBusca = busca.toLowerCase().trim()
    return data.filter(
      (cliente) =>
        cliente.nome?.toLowerCase().includes(termoBusca) ||
        cliente.cpf_cnpj?.toLowerCase().includes(termoBusca) ||
        cliente.email?.toLowerCase().includes(termoBusca)
    )
  }, [data, busca])

  const limparBusca = () => setBusca("")

  const handleLogOpen = (cliente: any) => {
    setSelectedCliente(cliente)
    setIsLogOpen(true)
  }

  const handleLogClose = () => {
    setIsLogOpen(false)
    setSelectedCliente(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card">
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/10">
                <UserX className="h-5 w-5 text-warning" />
              </div>
              <div>
                <DialogTitle className="text-xl">Clientes Inativos</DialogTitle>
                <DialogDescription>
                  Clientes sem contrato ativo na integração. Você pode ver logs e reintegrar.
                </DialogDescription>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
                <p className="text-xs text-muted-foreground mb-1">Total Inativos</p>
                <p className="text-2xl font-bold text-warning">
                  {loading ? "..." : data.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Exibindo</p>
                <p className="text-2xl font-bold text-primary">
                  {loading ? "..." : clientesFiltrados.length}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
              />
              {busca && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparBusca}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warning mx-auto mb-3" />
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              </div>
            ) : clientesFiltrados.length > 0 ? (
              <div className="space-y-3">
                {clientesFiltrados.map((cliente, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">
                            {cliente.nome}
                          </h4>
                          <Badge variant="outline" className="shrink-0 border-warning/50 text-warning">
                            Sem Contrato
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="font-mono">{cliente.cpf_cnpj}</span>
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate">{cliente.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogOpen(cliente)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Log
                        </Button>
                        <ReintegrarCliente nome={cliente.nome} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  {data.length === 0 ? (
                    <>
                      <div className="text-5xl mb-3">🎉</div>
                      <p className="font-medium text-foreground">Excelente!</p>
                      <p className="text-sm text-muted-foreground">
                        Todos os clientes possuem contrato ativo.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-medium text-foreground">Nenhum resultado</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Nenhum cliente corresponde à busca "{busca}"
                      </p>
                      <Button variant="outline" size="sm" onClick={limparBusca}>
                        Limpar busca
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && data.length > 0 && (
            <div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {clientesFiltrados.length === data.length
                  ? `${data.length} clientes inativos`
                  : `${clientesFiltrados.length} de ${data.length} clientes`}
              </span>
              <div className="flex items-center gap-2">
                {busca && (
                  <Button variant="ghost" size="sm" onClick={limparBusca}>
                    Limpar filtros
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchClientes} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Individual Modal */}
      <LogIndividual
        open={isLogOpen}
        onClose={handleLogClose}
        cliente={selectedCliente}
      />
    </>
  )
}
