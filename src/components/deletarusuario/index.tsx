import { useState } from "react";
import api from "@/services/api";

interface UserProps {
  idUser: number | string; // Tipo explícito para o ID do usuário
  listarUsuarios: () => void; // Função para listar usuários
}

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

export function DeletarUsuario({ idUser, listarUsuarios }: UserProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Estado para controlar a abertura do dialog

  // Função para deletar o usuário
  async function DeletarUsuarioUnico() {
    try {
      const result = await api.delete(
        "/src/services/DeletarUsuario.php",
        {
          headers: {
            iduser: String(idUser), // Enviando o ID como string no cabeçalho
          },
        }
      );

      console.log("Usuário deletado com sucesso:", result.data);
      
      // Fecha o dialog ANTES de atualizar a lista para evitar conflito de foco
      setIsDialogOpen(false);
      
      // Aguarda um pequeno delay para garantir que o dialog fechou antes de atualizar
      setTimeout(() => {
        listarUsuarios(); // Atualiza a lista de usuários após a exclusão
      }, 100);
    } catch (error: any) {
      setIsDialogOpen(false); // Fecha o dialog mesmo em caso de erro
      
      if (error.response) {
        console.error("Erro na resposta:", error.response.data);
      } else if (error.request) {
        console.error("Erro na requisição:", error.request);
      } else {
        console.error("Erro geral:", error.message);
      }
    }
  }

  return (
    <div>
      <p
        onClick={() => setIsDialogOpen(true)}
        style={{ cursor: "pointer", color: "red" }}
      >
        Deletar
      </p>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente deletar este usuário?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={DeletarUsuarioUnico}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
