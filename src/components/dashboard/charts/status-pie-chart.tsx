import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import useIntegrador from "@/hooks/use-integrador"
import { TotalClienteDash } from "@/services/totalclientes"
import { ClientesCanceladosApi } from "@/services/clientesCancelados"

const COLORS = [
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
]

interface StatusPieChartProps {
  filters?: {
    status?: string
    periodo?: string
  }
}

export function StatusPieChart({ filters }: StatusPieChartProps) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
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

        const totalBase = Number(clientesData?.nao_nulos || 0)
        let inativos = Number(clientesData?.nulos || 0)
        let cancelados = canceladosData?.length || 0
        
        // Clientes ativos = total base - cancelados (inativos são separados, vêm de "nulos")
        let ativos = Math.max(0, totalBase - cancelados)

        // Aplicar filtro de status se existir
        if (filters?.status) {
          if (filters.status === 'ativos') {
            inativos = 0
            cancelados = 0
          } else if (filters.status === 'inativos') {
            ativos = 0
            cancelados = 0
          } else if (filters.status === 'cancelados') {
            ativos = 0
            inativos = 0
          }
        }

        setData([
          { name: 'Ativos', value: ativos, color: COLORS[0] },
          { name: 'Inativos', value: inativos, color: COLORS[1] },
          { name: 'Cancelados', value: cancelados, color: COLORS[2] },
        ].filter(item => item.value > 0))
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [integrador, filters])

  // Total na base = ativos + cancelados (nao_nulos), alinhado com o card "Total de Clientes"
  const ativosValue = data.find(d => d.name === 'Ativos')?.value || 0
  const canceladosValue = data.find(d => d.name === 'Cancelados')?.value || 0
  const total = ativosValue + canceladosValue

  // Formatar números com separadores
  const formatNumber = (num: number) => num.toLocaleString('pt-BR')

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      // Calcular porcentagem sobre total geral (incluindo cancelados para o gráfico)
      const graphTotal = data.reduce((sum, d) => sum + d.value, 0)
      const percentage = graphTotal > 0 ? ((item.value / graphTotal) * 100).toFixed(1) : "0"
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(item.value)} clientes ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Distribuição de Status</CardTitle>
        <CardDescription>Visão geral do status dos clientes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm text-muted-foreground">
                      {value} ({formatNumber(entry.payload.value)})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center text - Total de clientes na base (ativos + inativos) */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-xl font-bold text-foreground">{formatNumber(total)}</p>
              <p className="text-[10px] text-muted-foreground">Na base</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
