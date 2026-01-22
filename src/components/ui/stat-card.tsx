import * as React from "react"
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  tooltip?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
  isLoading?: boolean
}

const variantStyles = {
  default: {
    container: 'border-border',
    icon: 'bg-secondary text-foreground',
    value: 'text-foreground',
  },
  primary: {
    container: 'border-primary/20',
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
  success: {
    container: 'border-success/20',
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  warning: {
    container: 'border-warning/20',
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  destructive: {
    container: 'border-destructive/20',
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-destructive',
  },
}

export function StatCard({
  title,
  value,
  description,
  tooltip,
  icon,
  trend,
  variant = 'default',
  className,
  isLoading = false,
}: StatCardProps) {
  const styles = variantStyles[variant]
  
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-success bg-success/10'
    if (trend.value < 0) return 'text-destructive bg-destructive/10'
    return 'text-muted-foreground bg-secondary'
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
        styles.container,
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                styles.icon
              )}>
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-secondary" />
          ) : (
            <span className={cn(
              "text-3xl font-bold tracking-tight",
              styles.value
            )}>
              {value}
            </span>
          )}
          
          {trend?.label && (
            <span className="text-xs text-muted-foreground">
              {trend.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}