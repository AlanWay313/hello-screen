import { useEffect, useState } from "react"
import { Users, UserCheck, UserX, XCircle } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import useIntegrador from "@/hooks/use-integrador"
import { ListarTodosClientes } from "@/services/listarTodosClientes"
import { filterByPeriodo } from "@/lib/date-filter-utils"
import { DashboardFilters } from "./dashboard-filters-context"
import { CanceladosModal } from "./modals/cancelados-modal"
import { InativosModal } from "./modals/inativos-modal"

interface Stats {
  total: number
  ativos: number
  inativos: number
  cancelados: number
}

interface StatsOverviewProps {
  filters?: DashboardFilters
}

export function StatsOverview({ filters }: StatsOverviewProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    cancelados: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [canceladosModalOpen, setCanceladosModalOpen] = useState(false)
  const [inativosModalOpen, setInativosModalOpen] = useState(false)
  const integrador = useIntegrador()

  useEffect(() => {
    async function fetchStats() {
      if (!integrador) return
      
      setIsLoading(true)
      try {
        const todosClientes = await ListarTodosClientes(integrador)

        // Aplicar filtro de período usando created_at
        const clientesFiltrados = filterByPeriodo(todosClientes, filters?.periodo || "todos")

        // Calcular contagens por status
        let ativos = 0
        let inativos = 0
        let cancelados = 0

        clientesFiltrados.forEach((cliente: any) => {
          const status = cliente.voalle_contract_status?.toLowerCase()
          const temContrato = cliente.ole_contract_number && cliente.ole_contract_number.toString().trim() !== ''

          if (status === 'cancelado') {
            cancelados++
          } else if (!temContrato) {
            inativos++
          } else if (status === 'normal') {
            ativos++
          } else {
            if (temContrato) ativos++
            else inativos++
          }
        })

        // Aplicar filtro de status
        if (filters?.status && filters.status !== "todos") {
          if (filters.status === "ativos") {
            inativos = 0
            cancelados = 0
          } else if (filters.status === "inativos") {
            ativos = 0
            cancelados = 0
          } else if (filters.status === "cancelados") {
            ativos = 0
            inativos = 0
          }
        }

        setStats({
          total: ativos + inativos,
          ativos,
          inativos,
          cancelados,
        })
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [integrador, filters])

  // Determina quais cards mostrar baseado no filtro
  const showAll = !filters?.status || filters.status === "todos"
  const showAtivos = showAll || filters?.status === "ativos"
  const showInativos = showAll || filters?.status === "inativos"
  const showCancelados = showAll || filters?.status === "cancelados"

  return (
    <>
      <div className={`grid grid-cols-1 gap-4 ${
        showAll ? 'sm:grid-cols-2 lg:grid-cols-4' : 
        'sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {showAll && (
          <StatCard
            title="Total de Clientes"
            description="Cadastrados na base"
            tooltip="Soma de todos os clientes registrados no sistema, independente do status do contrato"
            value={stats.total}
            icon={<Users className="h-6 w-6" />}
            variant="primary"
            isLoading={isLoading}
          />
        )}
        
        {showAtivos && (
          <StatCard
            title="Clientes Ativos"
            description="Possuem contrato ativo"
            tooltip="Clientes que possuem um contrato ativo na integração e podem acessar os serviços"
            value={stats.ativos}
            icon={<UserCheck className="h-6 w-6" />}
            variant="success"
            isLoading={isLoading}
          />
        )}
        
        {showInativos && (
          <StatCard
            title="Clientes Inativos"
            description="Sem contrato na integração"
            tooltip="Clientes cadastrados na base mas que não possuem um contrato ativo vinculado. Clique no ícone para ver detalhes e reintegrar."
            value={stats.inativos}
            icon={<UserX className="h-6 w-6" />}
            variant="warning"
            isLoading={isLoading}
            onViewClick={() => setInativosModalOpen(true)}
          />
        )}
        
        {showCancelados && (
          <StatCard
            title="Cancelados"
            description="Contratos cancelados"
            tooltip="Clientes que tiveram seus contratos cancelados e não utilizam mais os serviços. Clique no ícone para ver a lista completa."
            value={stats.cancelados}
            icon={<XCircle className="h-6 w-6" />}
            variant="destructive"
            isLoading={isLoading}
            onViewClick={() => setCanceladosModalOpen(true)}
          />
        )}
      </div>

      {/* Modais */}
      <CanceladosModal 
        open={canceladosModalOpen} 
        onOpenChange={setCanceladosModalOpen} 
      />
      <InativosModal 
        open={inativosModalOpen} 
        onOpenChange={setInativosModalOpen} 
      />
    </>
  )
}
