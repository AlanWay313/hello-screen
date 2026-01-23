import { TitlePage } from "@/components/title";
import { IntegracaoSetup } from "@/components/configuracoes/integracao-setup";
import { SyncFromOle } from "@/components/configuracoes/sync-from-ole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Webhook, Server, RefreshCw } from "lucide-react";

export function Configuracoes() {
  return (
    <div className="space-y-6">
      <TitlePage title="Configurações" />

      <Tabs defaultValue="integracao" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="integracao" className="gap-2">
            <Webhook className="h-4 w-4" />
            Integração
          </TabsTrigger>
          <TabsTrigger value="sincronizacao" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Server className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="geral" className="gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integracao" className="mt-6">
          <IntegracaoSetup />
        </TabsContent>

        <TabsContent value="sincronizacao" className="mt-6">
          <SyncFromOle />
        </TabsContent>

        <TabsContent value="sistema" className="mt-6">
          <div className="flex items-center justify-center h-40 border border-dashed rounded-lg text-muted-foreground">
            Configurações do sistema em breve...
          </div>
        </TabsContent>

        <TabsContent value="geral" className="mt-6">
          <div className="flex items-center justify-center h-40 border border-dashed rounded-lg text-muted-foreground">
            Configurações gerais em breve...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
