import { useEffect, useState } from "react"
import { Users, UserCheck, UserX, XCircle } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import useIntegrador from "@/hooks/use-integrador"
import { TotalClienteDash } from "@/services/totalclientes"
import { ClientesCanceladosApi } from "@/services/clientesCancelados"

interface Stats {
  total: number
  ativos: number
  inativos: number
  cancelados: number
}

export function StatsOverview() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    ativos: 0,
    inativos: 0,
    cancelados: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const integrador = useIntegrador()

  useEffect(() => {
    async function fetchStats() {
      if (!integrador) return
      
      setIsLoading(true)
      try {
        const [clientesData, canceladosData] = await Promise.all([
          TotalClienteDash(integrador),
          ClientesCanceladosApi(integrador),
        ])

        const ativos = Number(clientesData?.nao_nulos || 0)
        const inativos = Number(clientesData?.nulos || 0)
        const cancelados = canceladosData?.length || 0

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
  }, [integrador])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total de Clientes"
        description="Cadastrados na base"
        tooltip="Soma de todos os clientes registrados no sistema, independente do status do contrato"
        value={stats.total}
        icon={<Users className="h-6 w-6" />}
        variant="primary"
        isLoading={isLoading}
        trend={{ value: 12, label: "este mês" }}
      />
      
      <StatCard
        title="Clientes Ativos"
        description="Possuem contrato ativo"
        tooltip="Clientes que possuem um contrato ativo na integração e podem acessar os serviços"
        value={stats.ativos}
        icon={<UserCheck className="h-6 w-6" />}
        variant="success"
        isLoading={isLoading}
        trend={{ value: 8, label: "este mês" }}
      />
      
      <StatCard
        title="Clientes Inativos"
        description="Sem contrato na integração"
        tooltip="Clientes cadastrados na base mas que não possuem um contrato ativo vinculado"
        value={stats.inativos}
        icon={<UserX className="h-6 w-6" />}
        variant="warning"
        isLoading={isLoading}
        trend={{ value: -3, label: "este mês" }}
      />
      
      <StatCard
        title="Cancelados"
        description="Contratos cancelados"
        tooltip="Clientes que tiveram seus contratos cancelados e não utilizam mais os serviços"
        value={stats.cancelados}
        icon={<XCircle className="h-6 w-6" />}
        variant="destructive"
        isLoading={isLoading}
        trend={{ value: -5, label: "este mês" }}
      />
    </div>
  )
}