import { useState } from "react";
import { User, Shield, Mail, Key, Settings, UserCircle, ChevronRight } from "lucide-react";
import useUserId from "@/hooks/use-user";
import userDataData from "@/hooks/use-usersall";
import { AlterarSenhaModal } from "@/components/mudarsenha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const userData = userDataData();

export default function Conta() {
  const [showModal, setShowModal] = useState(false);
  const idUser = useUserId();

  const handleChangePassword = () => {
    setShowModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header da Página */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
          <UserCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações pessoais e configurações de segurança
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Perfil */}
        <div className="lg:col-span-2">
          <Card className="border-border shadow-card">
            <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Informações do Perfil</CardTitle>
                  <CardDescription>Seus dados pessoais cadastrados no sistema</CardDescription>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                  Conta ativa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  {userData.avatar ? (
                    <img 
                      src={userData.avatar} 
                      alt="Avatar" 
                      className="h-16 w-16 rounded-full object-cover" 
                    />
                  ) : (
                    <User className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{userData.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {userData.accountType || "Usuário"}
                    </Badge>
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      E-mail
                    </p>
                    <p className="text-foreground font-medium">{userData.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Nome de Usuário
                    </p>
                    <p className="text-foreground font-medium font-mono">{userData.username || userData.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Segurança */}
        <div className="space-y-4">
          <Card className="border-border shadow-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Shield className="h-4 w-4 text-success" />
                </div>
                <CardTitle className="text-base">Segurança</CardTitle>
              </div>
              <CardDescription>Gerencie suas credenciais de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleChangePassword}
                className="w-full justify-between h-auto py-3 px-4 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-warning/10 rounded-md">
                    <Key className="h-4 w-4 text-warning" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Alterar Senha</p>
                    <p className="text-xs text-muted-foreground">Atualize sua senha de acesso</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-sm text-success font-medium">Conta verificada</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-4">
                  Sua conta está protegida e ativa
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card de Configurações (opcional para futuro) */}
          <Card className="border-border shadow-card border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Settings className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Mais configurações</p>
                  <p className="text-xs">Em breve...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Alteração de Senha */}
      <AlterarSenhaModal
        userId={idUser}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}