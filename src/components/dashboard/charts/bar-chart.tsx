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

// Simulated weekly data
const generateWeeklyData = () => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  
  return days.map((day) => ({
    day,
    novos: Math.floor(Math.random() * 15 + 5),
    cancelados: Math.floor(Math.random() * 5),
  }))
}

export function WeeklyBarChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setData(generateWeeklyData())
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span 
                className="w-3 h-3 rounded" 
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
        <CardTitle className="text-lg font-semibold">Atividade Semanal</CardTitle>
        <CardDescription>Novos clientes e cancelamentos por dia</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
              <Bar 
                dataKey="novos" 
                name="Novos"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="cancelados" 
                name="Cancelados"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
