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
import { TrendingUp, ArrowUp, ArrowDown, Users, Database } from "lucide-react"
import useIntegrador from "@/hooks/use-integrador"
import { TotalClienteDash } from "@/services/totalclientes"
import { ClientesCanceladosApi } from "@/services/clientesCancelados"
import { DashboardFilters } from "../dashboard-filters-context"
import { useClientsHistory } from "@/hooks/use-clients-history"

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
  const { saveSnapshot, getChartData, hasHistory, calculateNewClients } = useClientsHistory()

  useEffect(() => {
    async function fetchData() {
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

        // Salvar snapshot atual no histórico (sempre salva dados reais, ignora filtros)
        saveSnapshot({ ativos, inativos, cancelados })

        // Aplicar filtro de status para exibição
        let displayAtivos = ativos
        let displayInativos = inativos
        let displayCancelados = cancelados

        if (filters?.status && filters.status !== "todos") {
          if (filters.status === "ativos") {
            displayInativos = 0
            displayCancelados = 0
          } else if (filters.status === "inativos") {
            displayAtivos = 0
            displayCancelados = 0
          } else if (filters.status === "cancelados") {
            displayAtivos = 0
            displayInativos = 0
          }
        }

        setStats({
          ativos: displayAtivos,
          inativos: displayInativos,
          cancelados: displayCancelados,
          total: displayAtivos + displayInativos,
        })

        // Usar dados do histórico real (chamado após saveSnapshot)
        setTimeout(() => {
          const historicalData = getChartData()
          
          if (historicalData.length > 0) {
            setData(historicalData)
          } else {
            // Se não há histórico ainda, mostrar apenas o mês atual
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
            const now = new Date()
            const monthLabel = `${monthNames[now.getMonth()]}/${String(now.getFullYear()).slice(-2)}`
            setData([{
              month: monthLabel,
              ativos: ativos,
              novos: 0,
            }])
          }
        }, 100)
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrador, filters])

  const formatNumber = (num: number) => num.toLocaleString('pt-BR')
  // Retenção baseada em cancelados: (total - cancelados) / total * 100
  const totalComCancelados = stats.ativos + stats.inativos + stats.cancelados
  const retencao = totalComCancelados > 0 
    ? (((totalComCancelados - stats.cancelados) / totalComCancelados) * 100).toFixed(1) 
    : "100"
  const novosUltimoMes = calculateNewClients(stats.ativos)

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
              <span className="font-semibold text-foreground">{formatNumber(entry.value)}</span>
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
              {hasHistory ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Dados reais
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                  Coletando dados...
                </span>
              )}
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
              {isLoading ? "..." : formatNumber(stats.ativos)}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <Users className="w-3 h-3" />
              <span>Com contrato ativo</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Novos este mês</p>
            <p className="text-2xl font-bold text-success">
              {isLoading ? "..." : novosUltimoMes > 0 ? `+${formatNumber(novosUltimoMes)}` : "—"}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUp className="w-3 h-3" />
              <span>{hasHistory ? "vs mês anterior" : "Aguardando histórico"}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 border border-accent/20">
            <p className="text-sm text-muted-foreground mb-1">Taxa Retenção</p>
            <p className="text-2xl font-bold text-accent">
              {isLoading ? "..." : `${retencao}%`}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <ArrowDown className="w-3 h-3" />
              <span>{formatNumber(stats.cancelados)} cancelados</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Carregando dados...
            </div>
          ) : data.length === 1 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Database className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                <span className="block font-medium text-foreground">Coletando histórico</span>
                <span className="text-sm">O gráfico será populado conforme os meses passarem</span>
              </p>
              <p className="text-xs mt-2 text-muted-foreground/70">
                Mês atual: {formatNumber(stats.ativos)} ativos
              </p>
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
                  tickFormatter={(value) => formatNumber(value)}
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
