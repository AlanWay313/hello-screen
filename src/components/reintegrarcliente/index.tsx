import useIntegrador from "@/hooks/use-integrador";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReintegrarCliente({ nome }: any) {
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const user: any = JSON.parse(localStorage.getItem("access") as any);
  const integrador: any = useIntegrador();
  const { toast }: any = useToast();

  async function Reintegra() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("idIntegra", integrador);
      formData.append("nome_cliente", String(nome));
      formData.append("Username", String(user.user));
      formData.append("Token", String(user.token));
      formData.append("Password", String(user.pass));

      const response = await api.post("/src/services/ReintegrarCliente.php", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      if (!response.data.message) {
        toast({
          title: "Reintegração concluída",
          description: "Verifique o log para mais detalhes!",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Reintegração",
        description: response.data.message,
      });
    } catch (error) {
      toast({
        title: "Erro na reintegração",
        description: "Falha ao reintegrar o cliente. Tente novamente.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setLoading(false);
      setOpenModal(false);
    }
  }

  return (
    <>
      {/* Modal de confirmação */}
      <AlertDialog open={openModal} onOpenChange={setOpenModal}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center">
              Reintegrar cliente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="block mb-2">
                Deseja reintegrar o cliente:
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-foreground font-medium text-sm">
                {nome}
              </span>
              <span className="block mt-3 text-xs">
                Esta ação irá sincronizar os dados do cliente com o sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel 
              onClick={() => setOpenModal(false)}
              className="sm:w-32"
              disabled={loading}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={Reintegra} 
              disabled={loading}
              className="sm:w-32"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aguarde
                </>
              ) : (
                "Reintegrar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item do dropdown menu */}
      <button
        onClick={() => setOpenModal(true)}
        disabled={loading}
        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 text-primary ${loading ? 'animate-spin' : ''}`} />
        <span>Reintegrar</span>
        {loading && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
      </button>
    </>
  );
}