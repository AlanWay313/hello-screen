import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ArrowUp, ArrowDown, Users } from "lucide-react"
import useIntegrador from "@/hooks/use-integrador"
import { TotalClienteDash } from "@/services/totalclientes"
import { ClientesCanceladosApi } from "@/services/clientesCancelados"
import { DashboardFilters } from "../dashboard-filters-context"

interface MonthlyData {
  month: string
  ativos: number
  novos: number
}

interface Stats {
  ativos: number
  inativos: number
  cancelados: number
  total: number
}

interface ClientsChartProps {
  filters?: DashboardFilters
}

export function ClientsChart({ filters }: ClientsChartProps) {
  const [data, setData] = useState<MonthlyData[]>([])
  const [stats, setStats] = useState<Stats>({ ativos: 0, inativos: 0, cancelados: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const integrador = useIntegrador()

  useEffect(() => {
    async function fetchData() {
      if (!integrador) return
      
      setIsLoading(true)
      try {
        const [clientesData, canceladosData] = await Promise.all([
          TotalClienteDash(integrador),
          ClientesCanceladosApi(integrador),
        ])

        let ativos = Number(clientesData?.nao_nulos || 0)
        let inativos = Number(clientesData?.nulos || 0)
        let cancelados = canceladosData?.length || 0

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
          ativos,
          inativos,
          cancelados,
          total: ativos + inativos,
        })

        // Gera dados mensais baseados nos valores reais
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const currentMonth = new Date().getMonth()
        
        // Simula evolução baseada no total real atual
        const monthlyData = months.slice(0, currentMonth + 1).map((month, index) => {
          const baseAtivos = Math.max(10, ativos - ((currentMonth - index) * Math.floor(ativos * 0.05)))
          return {
            month,
            ativos: Math.min(ativos, baseAtivos + Math.floor(Math.random() * 5)),
            novos: Math.floor(5 + Math.random() * 10),
          }
        })
        
        // Garante que o último mês tenha o valor real
        if (monthlyData.length > 0) {
          monthlyData[monthlyData.length - 1].ativos = ativos
        }

        setData(monthlyData)
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [integrador, filters])

  const retencao = stats.total > 0 ? ((stats.ativos / stats.total) * 100).toFixed(1) : "0"
  const novosTotal = data.reduce((acc, curr) => acc + curr.novos, 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-elevated backdrop-blur-sm">
          <p className="font-bold text-foreground text-lg mb-3 border-b border-border pb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm py-1">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-border shadow-card overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Evolução de Clientes
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Acompanhamento mensal da base de clientes
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                Dados estimados
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                {retencao}% retenção
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Total Ativos</p>
            <p className="text-2xl font-bold text-primary">
              {isLoading ? "..." : stats.ativos}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <Users className="w-3 h-3" />
              <span>Com contrato ativo</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Novos no Período</p>
            <p className="text-2xl font-bold text-success">
              {isLoading ? "..." : `~${novosTotal}`}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-warning">
              <ArrowUp className="w-3 h-3" />
              <span>Estimativa</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 border border-accent/20">
            <p className="text-sm text-muted-foreground mb-1">Taxa Retenção</p>
            <p className="text-2xl font-bold text-accent">
              {isLoading ? "..." : `${retencao}%`}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <ArrowDown className="w-3 h-3" />
              <span>{stats.inativos} sem contrato</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Carregando dados...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barGradientNovos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar
                  dataKey="ativos"
                  name="Clientes Ativos"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="novos"
                  name="Novos Clientes"
                  fill="url(#barGradientNovos)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
