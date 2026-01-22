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
import { TrendingUp, ArrowUp, ArrowDown } from "lucide-react"

// Simulated data - replace with real API data
const generateMonthlyData = () => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const currentMonth = new Date().getMonth()
  
  return months.slice(0, currentMonth + 1).map((month, index) => ({
    month,
    ativos: Math.floor(180 + Math.random() * 80 + index * 15),
    novos: Math.floor(15 + Math.random() * 20),
    cancelados: Math.floor(5 + Math.random() * 10),
    crescimento: Math.floor(Math.random() * 20 - 5),
  }))
}

export function ClientsChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setData(generateMonthlyData())
  }, [])

  const totalAtivos = data.length > 0 ? data[data.length - 1]?.ativos || 0 : 0
  const totalNovos = data.reduce((acc, curr) => acc + curr.novos, 0)

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
            <CardDescription>Acompanhamento mensal da base de clientes</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              +12%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Total Ativos</p>
            <p className="text-2xl font-bold text-primary">{totalAtivos}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUp className="w-3 h-3" />
              <span>+5% vs mês anterior</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-muted-foreground mb-1">Novos no Período</p>
            <p className="text-2xl font-bold text-success">{totalNovos}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUp className="w-3 h-3" />
              <span>+12% vs anterior</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4 border border-accent/20">
            <p className="text-sm text-muted-foreground mb-1">Taxa Retenção</p>
            <p className="text-2xl font-bold text-accent">94.5%</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <ArrowDown className="w-3 h-3" />
              <span>-0.5% vs anterior</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
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
        </div>
      </CardContent>
    </Card>
  )
}
