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
  Link
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
  const [showPassword, setShowPassword] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [result, setResult] = useState<SetupResponse | null>(null)
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
      setResult(res)
      setSetupComplete(true)
      localStorage.setItem('admin_auth_token', res.authToken)
      toast({ title: 'Sucesso', description: 'Integração configurada!' })
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: 'Copiado!', description: `${label} copiado` })
  }

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
                  Configurar Integração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {setupComplete && result && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Integração Ativa
            </CardTitle>
            <CardDescription>Use estas informações no sistema externo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                <code className="flex-1 text-sm font-mono truncate">{result.webhookUrl}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(result.webhookUrl, 'URL')}
                >
                  {copied === 'URL' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {['Username', 'Password', 'Token'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <span className="text-xs text-muted-foreground">{key}</span>
                    <p className="font-mono text-sm">
                      {key === 'Token' 
                        ? `${result.webhookHeaders.Token.slice(0, 24)}...`
                        : key === 'Password' 
                          ? '••••••••'
                          : result.webhookHeaders[key as keyof typeof result.webhookHeaders]
                      }
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(
                      result.webhookHeaders[key as keyof typeof result.webhookHeaders],
                      key
                    )}
                  >
                    {copied === key ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
