import { useEffect, useState } from "react"
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react"
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
        description="Clientes cadastrados"
        value={stats.total}
        icon={<Users className="h-6 w-6" />}
        variant="primary"
        isLoading={isLoading}
        trend={{ value: 12, label: "este mês" }}
      />
      
      <StatCard
        title="Clientes Ativos"
        description="Com acesso ao sistema"
        value={stats.ativos}
        icon={<UserCheck className="h-6 w-6" />}
        variant="success"
        isLoading={isLoading}
        trend={{ value: 8, label: "este mês" }}
      />
      
      <StatCard
        title="Clientes Inativos"
        description="Sem acesso ao sistema"
        value={stats.inativos}
        icon={<UserX className="h-6 w-6" />}
        variant="warning"
        isLoading={isLoading}
        trend={{ value: -3, label: "este mês" }}
      />
      
      <StatCard
        title="Cancelados"
        description="Contratos cancelados"
        value={stats.cancelados}
        icon={<TrendingUp className="h-6 w-6" />}
        variant="destructive"
        isLoading={isLoading}
        trend={{ value: -5, label: "este mês" }}
      />
    </div>
  )
}
