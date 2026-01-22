import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import api from "@/services/api"
import { KeyRound, Loader2, Mail } from "lucide-react"

export default function ResetSenha({ contratoCliente, emailCliente }: any) {
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast }: any = useToast()

  const handleResetSenha = async () => {
    try {
      setLoading(true)

      const result: any = await api.get("/src/models/ResetarSenhaCliente.php", {
        params: {
          contratoCliente: contratoCliente,
          emailCliente: emailCliente,
        },
      })

      if (!result || !result.data) {
        toast({
          title: "Resetar senha do usuário",
          description: "Ocorreu um erro ao resetar a senha!",
          variant: "destructive",
        })
        return
      }

      const mensagem = result.data.msg || result.data.message || "Operação concluída."

      toast({
        title: "Resetar senha do usuário",
        description: mensagem,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro no servidor",
        description: "Não foi possível resetar a senha. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setOpenModal(true)
  }

  const handleConfirmReset = () => {
    setOpenModal(false)
    handleResetSenha()
  }

  return (
    <>
      {/* Modal de confirmação */}
      <AlertDialog open={openModal} onOpenChange={setOpenModal}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <KeyRound className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-center">
              Resetar senha do cliente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="block mb-2">
                O cliente receberá instruções no e-mail cadastrado:
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-foreground font-medium text-sm">
                <Mail className="h-4 w-4" />
                {emailCliente}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel 
              onClick={() => setOpenModal(false)}
              className="sm:w-32"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReset} 
              disabled={loading}
              className="sm:w-32 bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item do dropdown menu */}
      <button
        onClick={handleOpenModal}
        disabled={loading}
        className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <KeyRound className="h-4 w-4 text-warning" />
        <span>Resetar Senha</span>
        {loading && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
      </button>
    </>
  )
}