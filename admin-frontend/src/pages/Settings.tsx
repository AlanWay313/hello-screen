import { useState } from 'react'
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api, SetupResponse } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function Settings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [setupComplete, setSetupComplete] = useState(!!localStorage.getItem('admin_auth_token'))
  const [result, setResult] = useState<SetupResponse['data'] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({
    oleKeyapi: '',
    oleLogin: '',
    olePassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.oleKeyapi || !form.oleLogin || !form.olePassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const res = await api.setupIntegration(form)
      setResult(res.data)
      setSetupComplete(true)
      localStorage.setItem('admin_auth_token', res.data.authToken)
      toast({ 
        title: res.data.isNew ? 'Integração criada!' : 'Integração já existe', 
        description: 'Token de autenticação salvo' 
      })
    } catch (err) {
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Falha na configuração', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await api.regenerateToken()
      if (result) {
        setResult({
          ...result,
          webhookToken: res.data.webhookToken,
          webhookUrl: res.data.webhookUrl,
        })
      }
      toast({ title: 'Sucesso', description: 'Token regenerado! Atualize no sistema externo.' })
    } catch (err) {
      toast({ 
        title: 'Erro', 
        description: err instanceof Error ? err.message : 'Falha ao regenerar', 
        variant: 'destructive' 
      })
    } finally {
      setRegenerating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência` })
  }

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => copyToClipboard(text, label)}
    >
      {copied === label ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Configure a integração com a Olé TV</p>
      </div>

      {/* Setup Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Credenciais Olé TV
              </CardTitle>
              <CardDescription>Configure as credenciais de acesso à API</CardDescription>
            </div>
            {setupComplete && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
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
                    placeholder="Chave de API"
                    value={form.oleKeyapi}
                    onChange={(e) => setForm({ ...form, oleKeyapi: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="oleLogin">Login</Label>
                <Input
                  id="oleLogin"
                  placeholder="Usuário"
                  value={form.oleLogin}
                  onChange={(e) => setForm({ ...form, oleLogin: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="olePassword">Senha</Label>
              <div className="relative">
                <Input
                  id="olePassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={form.olePassword}
                  onChange={(e) => setForm({ ...form, olePassword: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700">Credenciais serão criptografadas com AES-256</p>
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
                  {setupComplete ? 'Atualizar Configuração' : 'Configurar Integração'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Integração Ativa
            </CardTitle>
            <CardDescription>Use estas informações no sistema externo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono truncate">{result.webhookUrl}</code>
                <CopyButton text={result.webhookUrl} label="URL" />
              </div>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Token do Webhook</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono truncate">
                  {result.webhookToken.slice(0, 32)}...
                </code>
                <CopyButton text={result.webhookToken} label="Token" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Auth Token */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Token de Autenticação (API)</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono truncate">
                  {result.authToken.slice(0, 40)}...
                </code>
                <CopyButton text={result.authToken} label="Auth Token" />
              </div>
              <p className="text-xs text-muted-foreground">
                Use no header Authorization: Bearer {'{token}'}
              </p>
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Instruções para o Sistema Externo
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>URL:</strong> POST {result.webhookUrl}</p>
                <p><strong>Headers obrigatórios:</strong></p>
                <ul className="ml-4 list-disc">
                  <li>Content-Type: application/json</li>
                  <li>Username: (seu usuário)</li>
                  <li>Password: (sua senha)</li>
                  <li>Token: (token gerado acima)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
