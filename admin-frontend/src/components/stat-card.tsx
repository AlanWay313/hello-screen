import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: { value: number; positive: boolean }
  className?: string
  iconClassName?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
  onClick,
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all",
        onClick && "cursor-pointer hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.positive ? "text-green-600" : "text-red-600"
              )}>
                {trend.positive ? "+" : ""}{trend.value}% vs ontem
              </p>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            iconClassName || "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              iconClassName?.includes("text-") ? "" : "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
