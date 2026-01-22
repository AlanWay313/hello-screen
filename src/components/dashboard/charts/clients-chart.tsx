import { useEffect, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

// Simulated data - replace with real API data
const generateMonthlyData = () => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const currentMonth = new Date().getMonth()
  
  return months.slice(0, currentMonth + 1).map((month, index) => ({
    month,
    ativos: Math.floor(150 + Math.random() * 100 + index * 10),
    inativos: Math.floor(20 + Math.random() * 30),
    novos: Math.floor(10 + Math.random() * 25),
  }))
}

export function ClientsChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setData(generateMonthlyData())
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Evolução de Clientes</CardTitle>
            <CardDescription>Acompanhamento mensal de clientes ativos e inativos</CardDescription>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            +12%
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInativos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNovos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
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
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="ativos"
                name="Ativos"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAtivos)"
              />
              <Area
                type="monotone"
                dataKey="novos"
                name="Novos"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNovos)"
              />
              <Area
                type="monotone"
                dataKey="inativos"
                name="Inativos"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInativos)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
