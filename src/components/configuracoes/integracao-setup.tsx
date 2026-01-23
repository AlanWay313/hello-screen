import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Key, Link, Shield, Copy, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SetupResponse {
  success: boolean;
  integration: {
    id: string;
    webhookToken: string;
    createdAt: string;
  };
  webhookUrl: string;
  webhookHeaders: {
    Username: string;
    Password: string;
    Token: string;
  };
  authToken: string;
}

export function IntegracaoSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResponse | null>(null);

  const [formData, setFormData] = useState({
    oleKeyapi: "",
    oleLogin: "",
    olePassword: "",
  });

  const [copied, setCopied] = useState<string | null>(null);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.oleKeyapi || !formData.oleLogin || !formData.olePassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todas as credenciais da Olé TV.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Simulated API call - replace with actual backend URL
      const backendUrl = localStorage.getItem("backend_url") || "http://localhost:3000";
      
      const response = await fetch(`${backendUrl}/integration/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao configurar integração");
      }

      const data: SetupResponse = await response.json();
      setSetupResult(data);
      setSetupComplete(true);

      // Save auth token for future API calls
      localStorage.setItem("integration_auth_token", data.authToken);

      toast({
        title: "Integração configurada!",
        description: "Token do webhook gerado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na configuração",
        description: error instanceof Error ? error.message : "Não foi possível conectar ao backend.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    const authToken = localStorage.getItem("integration_auth_token");
    if (!authToken) {
      toast({
        title: "Token não encontrado",
        description: "Configure a integração primeiro.",
        variant: "destructive",
      });
      return;
    }

    setRegenerating(true);

    try {
      const backendUrl = localStorage.getItem("backend_url") || "http://localhost:3000";

      const response = await fetch(`${backendUrl}/integration/regenerate-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao regenerar token");
      }

      const data = await response.json();

      if (setupResult) {
        setSetupResult({
          ...setupResult,
          webhookHeaders: {
            ...setupResult.webhookHeaders,
            Token: data.webhookToken,
          },
          integration: {
            ...setupResult.integration,
            webhookToken: data.webhookToken,
          },
        });
      }

      toast({
        title: "Token regenerado!",
        description: "O novo token foi gerado com sucesso. Atualize a configuração no sistema externo.",
      });
    } catch (error) {
      toast({
        title: "Erro ao regenerar",
        description: error instanceof Error ? error.message : "Não foi possível regenerar o token.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => copyToClipboard(text, label)}
    >
      {copied === label ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Backend URL Config */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL do Backend
          </CardTitle>
          <CardDescription>
            Configure o endereço do servidor de integração
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="http://localhost:3000"
              defaultValue={localStorage.getItem("backend_url") || ""}
              onChange={(e) => localStorage.setItem("backend_url", e.target.value)}
            />
            <Button variant="outline" onClick={() => {
              toast({ title: "URL salva!", description: "Endereço do backend atualizado." });
            }}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Configuração da Integração Olé TV
              </CardTitle>
              <CardDescription className="mt-1.5">
                Insira as credenciais da API Olé TV para configurar o webhook de sincronização
              </CardDescription>
            </div>
            {setupComplete && (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="oleKeyapi">API Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="oleKeyapi"
                    placeholder="Sua chave de API"
                    value={formData.oleKeyapi}
                    onChange={(e) => handleInputChange("oleKeyapi", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="oleLogin">Login</Label>
                <Input
                  id="oleLogin"
                  placeholder="Usuário da API"
                  value={formData.oleLogin}
                  onChange={(e) => handleInputChange("oleLogin", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="olePassword">Senha</Label>
              <div className="relative">
                <Input
                  id="olePassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha da API"
                  value={formData.olePassword}
                  onChange={(e) => handleInputChange("olePassword", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                A senha será criptografada com AES-256-GCM antes de ser armazenada.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Configurar Integração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Setup Result */}
      {setupComplete && setupResult && setupResult.webhookHeaders && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Integração Configurada com Sucesso
            </CardTitle>
            <CardDescription>
              Use as informações abaixo para configurar o webhook no sistema externo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono break-all">
                  {setupResult.webhookUrl || "URL não disponível"}
                </code>
                {setupResult.webhookUrl && (
                  <CopyButton text={setupResult.webhookUrl} label="Webhook URL" />
                )}
              </div>
            </div>

            <Separator />

            {/* Headers */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">Headers Obrigatórios</Label>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <span className="text-xs text-muted-foreground">Username</span>
                    <p className="font-mono text-sm">{setupResult.webhookHeaders.Username || "N/A"}</p>
                  </div>
                  {setupResult.webhookHeaders.Username && (
                    <CopyButton text={setupResult.webhookHeaders.Username} label="Username" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <span className="text-xs text-muted-foreground">Password</span>
                    <p className="font-mono text-sm">••••••••</p>
                  </div>
                  {setupResult.webhookHeaders.Password && (
                    <CopyButton text={setupResult.webhookHeaders.Password} label="Password" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">Token</span>
                    <p className="font-mono text-sm truncate">
                      {setupResult.webhookHeaders.Token 
                        ? `${setupResult.webhookHeaders.Token.substring(0, 32)}...`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {setupResult.webhookHeaders.Token && (
                      <CopyButton text={setupResult.webhookHeaders.Token} label="Token" />
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={regenerating}
                        >
                          <RefreshCw className={`h-4 w-4 text-muted-foreground ${regenerating ? 'animate-spin' : ''}`} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Regenerar Token do Webhook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O token atual será invalidado imediatamente. Você precisará atualizar a configuração no sistema externo com o novo token.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRegenerateToken}>
                            {regenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerar Token
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Auth Token */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Token de Autenticação (API Admin)</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono truncate">
                  {setupResult.authToken 
                    ? `${setupResult.authToken.substring(0, 40)}...`
                    : "Token não disponível"}
                </code>
                {setupResult.authToken && (
                  <CopyButton text={setupResult.authToken} label="Auth Token" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Use este token no header Authorization para acessar endpoints administrativos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
