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
import { Search, X, Users, Mail, Phone, MapPin, FileText } from "lucide-react"
import useIntegrador from "@/hooks/use-integrador"
import api from "@/services/api"

interface CanceladosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CanceladosModal({ open, onOpenChange }: CanceladosModalProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState("")
  const integra = useIntegrador()

  useEffect(() => {
    async function fetchClientes() {
      if (!open || !integra) return
      
      setLoading(true)
      try {
        const result = await api.get("/src/clientes/listarclientes.php", {
          params: { idIntegra: integra },
        })

        const clientesCancelados = result.data.data.filter(
          (cliente: any) =>
            cliente.voalle_contract_status &&
            cliente.voalle_contract_status.trim().toLowerCase() === "cancelado"
        )

        setData(clientesCancelados)
      } catch (error) {
        console.error("Erro ao buscar clientes cancelados:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClientes()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Users className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Clientes Cancelados</DialogTitle>
              <DialogDescription>
                Lista de clientes com contratos cancelados no sistema
              </DialogDescription>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground mb-1">Total Cancelados</p>
              <p className="text-2xl font-bold text-destructive">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive mx-auto mb-3" />
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
                        <Badge variant="destructive" className="shrink-0">
                          Cancelado
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
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
                        {cliente.contato && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{cliente.contato}</span>
                          </div>
                        )}
                        {cliente.endereco_logradouro && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{cliente.endereco_logradouro}</span>
                          </div>
                        )}
                      </div>

                      {cliente.ole_contract_number && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Contrato: <span className="font-mono">{cliente.ole_contract_number}</span>
                        </div>
                      )}
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
                      Nenhum contrato cancelado encontrado.
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
                ? `${data.length} clientes cancelados`
                : `${clientesFiltrados.length} de ${data.length} clientes`}
            </span>
            {busca && (
              <Button variant="ghost" size="sm" onClick={limparBusca}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
