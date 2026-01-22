import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import useIntegrador from "@/hooks/use-integrador"
import { TotalClienteDash } from "@/services/totalclientes"
import { ClientesCanceladosApi } from "@/services/clientesCancelados"

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
]

export function StatusPieChart() {
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

        const ativos = Number(clientesData?.nao_nulos || 0)
        const inativos = Number(clientesData?.nulos || 0)
        const cancelados = canceladosData?.length || 0

        setData([
          { name: 'Ativos', value: ativos, color: COLORS[1] },
          { name: 'Inativos', value: inativos, color: COLORS[2] },
          { name: 'Cancelados', value: cancelados, color: COLORS[3] },
        ])
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [integrador])

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const percentage = ((item.value / total) * 100).toFixed(1)
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.value} clientes ({percentage}%)
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
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  innerRadius={50}
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
                      {value} ({entry.payload.value})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-40px' }}>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
