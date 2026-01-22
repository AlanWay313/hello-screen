import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useIntegrador from "@/hooks/use-integrador";
import api from "@/services/api";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  UserPlus, 
  User, 
  Mail, 
  Shield, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Loader2,
  HelpCircle,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

type CriarUsuariosProps = {
  listarUsuarios: () => void;
};

export function CriarUsuarios({ listarUsuarios }: CriarUsuariosProps) {
  const integra: any = useIntegrador();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState("true");
  const [isAdmin, setIsAdmin] = useState("false");
  const { toast } = useToast();

  async function criarUsuario() {
    // Validação básica
    if (!name.trim() || !email.trim() || !username.trim() || !password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const dataUser = {
        name,
        email,
        username,
        password,
        isActive: isActive === 'true',
        isAdmin: isAdmin === 'true',
      };

      await api.post(
        "/src/services/CriarNovoUsuario.php",
        dataUser,
        {
          params: {
            integraId: integra,
          },
        }
      );

      toast({
        title: "Usuário criado",
        description: `O usuário ${name} foi criado com sucesso!`,
      });

      listarUsuarios();
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro ao criar usuário",
        description: "Não foi possível criar o usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setEmail("");
    setUserName("");
    setPassword("");
    setIsActive("true");
    setIsAdmin("false");
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Criar novo usuário
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Adicionar um novo usuário ao sistema</p>
          </TooltipContent>
        </Tooltip>
        
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Dados Pessoais */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </h3>
              
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Nome completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite o nome completo"
                  disabled={isLoading}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  disabled={isLoading}
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Credenciais */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Credenciais de Acesso
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs">Nome de usuário *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="usuario123"
                    disabled={isLoading}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    Senha *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Configurações */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Configurações
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    Status da conta
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Usuários inativos não podem fazer login</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select onValueChange={setIsActive} value={isActive} disabled={isLoading}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-success" />
                          Ativo
                        </div>
                      </SelectItem>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4 text-destructive" />
                          Inativo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    Nível de acesso
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Administradores têm acesso total ao sistema</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select onValueChange={setIsAdmin} value={isAdmin} disabled={isLoading}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Usuário comum
                        </div>
                      </SelectItem>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-warning" />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={criarUsuario}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar usuário
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}