import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "bg-card border rounded-lg shadow-lg p-4 pr-8 relative animate-in slide-in-from-bottom-2",
            toast.variant === "destructive" && "border-destructive/50 bg-destructive/10"
          )}
        >
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          {toast.title && (
            <p className={cn(
              "font-semibold text-sm",
              toast.variant === "destructive" && "text-destructive"
            )}>
              {toast.title}
            </p>
          )}
          {toast.description && (
            <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
