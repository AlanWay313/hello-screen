import { TabelaLogs } from "@/components/tabelalogs";
import { FileText } from "lucide-react";

export function Logs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs do Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe todas as ações e eventos do sistema em tempo real
            </p>
          </div>
        </div>
      </div>

      <TabelaLogs />
    </div>
  )
}
