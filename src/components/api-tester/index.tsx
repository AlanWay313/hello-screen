import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Save,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParamDef {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

interface EndpointConfig {
  method: 'GET' | 'POST';
  url: string;
  description: string;
  urlParams?: ParamDef[];
  postParams?: ParamDef[];
}

interface ApiTesterProps {
  endpoint: EndpointConfig | null;
  onClose: () => void;
}

interface EnvironmentConfig {
  producao: string;
  teste: string;
}

const STORAGE_KEY = 'api-tester-environments';
const SELECTED_ENV_KEY = 'api-tester-selected-env';

// Extrai o path do endpoint (sem a base URL)
const extractPath = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
};

// Valores padrão
const DEFAULT_ENVIRONMENTS: EnvironmentConfig = {
  producao: 'https://api.oletv.net.br',
  teste: 'https://api-teste.oletv.net.br',
};

const loadEnvironments = (): EnvironmentConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_ENVIRONMENTS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao carregar ambientes:', e);
  }
  return DEFAULT_ENVIRONMENTS;
};

const loadSelectedEnv = (): 'producao' | 'teste' => {
  try {
    const saved = localStorage.getItem(SELECTED_ENV_KEY);
    if (saved === 'producao' || saved === 'teste') {
      return saved;
    }
  } catch (e) {
    console.error('Erro ao carregar ambiente selecionado:', e);
  }
  return 'producao';
};

export function ApiTester({ endpoint, onClose }: ApiTesterProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showParams, setShowParams] = useState(true);
  const [showEnvSettings, setShowEnvSettings] = useState(false);
  
  // Ambiente
  const [environments, setEnvironments] = useState<EnvironmentConfig>(loadEnvironments);
  const [selectedEnv, setSelectedEnv] = useState<'producao' | 'teste'>(loadSelectedEnv);
  const [editingEnvs, setEditingEnvs] = useState<EnvironmentConfig>(environments);
  const [envSaved, setEnvSaved] = useState(false);

  // Salvar ambiente selecionado
  useEffect(() => {
    localStorage.setItem(SELECTED_ENV_KEY, selectedEnv);
  }, [selectedEnv]);

  if (!endpoint) return null;

  const allParams = [
    ...(endpoint.urlParams || []),
    ...(endpoint.postParams || []),
  ];

  const handleInputChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const getActiveBaseUrl = () => {
    return environments[selectedEnv];
  };

  const saveEnvironments = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editingEnvs));
    setEnvironments(editingEnvs);
    setEnvSaved(true);
    setTimeout(() => setEnvSaved(false), 2000);
  };

  const buildUrl = () => {
    let path = extractPath(endpoint.url);
    (endpoint.urlParams || []).forEach(param => {
      const value = formValues[param.name] || `{${param.name}}`;
      path = path.replace(`{${param.name}}`, value);
    });
    return `${getActiveBaseUrl()}${path}`;
  };

  // Validação dos campos de autenticação
  const validateAuthFields = (): boolean => {
    const keyapi = formValues['keyapi']?.trim();
    const login = formValues['login']?.trim();
    const pass = formValues['pass']?.trim();
    
    return !!(keyapi && login && pass);
  };

  const handleTest = async () => {
    // Verificar se os campos de autenticação estão preenchidos
    if (!validateAuthFields()) {
      setResponse(JSON.stringify({
        error: "Campos de autenticação obrigatórios",
        message: "Preencha os campos keyapi, login e pass antes de enviar a requisição."
      }, null, 2));
      setResponseStatus('error');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setResponseStatus(null);

    try {
      const url = buildUrl();
      
      // Build FormData for POST params
      const formData = new FormData();
      (endpoint.postParams || []).forEach(param => {
        const value = formValues[param.name];
        if (value) {
          formData.append(param.name.replace('[]', ''), value);
        }
      });

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      setResponseStatus(data.retorno_status ? 'success' : 'error');
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
      setResponseStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearForm = () => {
    setFormValues({});
    setResponse(null);
    setResponseStatus(null);
  };

  const path = extractPath(endpoint.url);

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-sm">Testar API</h3>
          <p className="text-xs text-muted-foreground truncate max-w-[280px]">
            {endpoint.description}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Environment Selector */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border shrink-0 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3 w-3" />
              Ambiente
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setShowEnvSettings(!showEnvSettings);
                setEditingEnvs(environments);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Environment Toggle */}
          <div className="flex gap-2">
            <Button
              variant={selectedEnv === 'producao' ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => setSelectedEnv('producao')}
            >
              Produção
            </Button>
            <Button
              variant={selectedEnv === 'teste' ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => setSelectedEnv('teste')}
            >
              Teste
            </Button>
          </div>

          {/* Environment Settings */}
          {showEnvSettings && (
            <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">URL Produção</Label>
                <Input
                  placeholder="https://api.oletv.net.br"
                  value={editingEnvs.producao}
                  onChange={(e) => setEditingEnvs(prev => ({ ...prev, producao: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">URL Teste</Label>
                <Input
                  placeholder="https://api-teste.oletv.net.br"
                  value={editingEnvs.teste}
                  onChange={(e) => setEditingEnvs(prev => ({ ...prev, teste: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Button
                size="sm"
                className="w-full h-7 text-xs gap-1.5"
                onClick={saveEnvironments}
              >
                {envSaved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                {envSaved ? 'Salvo!' : 'Salvar URLs'}
              </Button>
            </div>
          )}
        </div>

        {/* URL Preview */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">URL Final</Label>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono font-bold shrink-0",
                "border-green-500/50 text-green-500 bg-green-500/10"
              )}
            >
              POST
            </Badge>
            <code className="text-xs font-mono text-muted-foreground truncate">
              {buildUrl()}
            </code>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Rota: {path}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Parameters Section */}
        <div className="p-4">
          <button 
            onClick={() => setShowParams(!showParams)}
            className="flex items-center gap-2 text-sm font-medium mb-3 hover:text-primary transition-colors"
          >
            {showParams ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Parâmetros ({allParams.length})
          </button>

          {showParams && (
            <div className="space-y-4">
              {/* Auth Params */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Autenticação
                </Label>
                {['keyapi', 'login', 'pass'].map(paramName => {
                  const param = allParams.find(p => p.name === paramName);
                  if (!param) return null;
                  return (
                    <div key={paramName} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-mono">{param.name}</Label>
                        <Badge variant="destructive" className="text-[10px] h-4">
                          Obrigatório
                        </Badge>
                      </div>
                      <Input
                        type={paramName === 'pass' ? 'password' : 'text'}
                        placeholder={param.description}
                        value={formValues[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* URL Params */}
              {endpoint.urlParams && endpoint.urlParams.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Parâmetros URL
                  </Label>
                  {endpoint.urlParams.map(param => (
                    <div key={param.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-mono">{param.name}</Label>
                        <span className="text-[10px] text-muted-foreground">({param.type})</span>
                        {param.required && (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <Input
                        placeholder={param.description}
                        value={formValues[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Other POST Params (excluding auth) */}
              {endpoint.postParams && endpoint.postParams.filter(p => !['keyapi', 'login', 'pass'].includes(p.name)).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Parâmetros POST
                    </Label>
                    {endpoint.postParams
                      .filter(p => !['keyapi', 'login', 'pass'].includes(p.name))
                      .map(param => (
                        <div key={param.name} className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Label className="text-xs font-mono">{param.name}</Label>
                            <span className="text-[10px] text-muted-foreground">({param.type})</span>
                            {param.required && (
                              <Badge variant="destructive" className="text-[10px] h-4">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                          <Input
                            placeholder={param.description}
                            value={formValues[param.name] || ''}
                            onChange={(e) => handleInputChange(param.name, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Response Section */}
        {response && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Resposta
                </Label>
                {responseStatus === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {responseStatus === 'error' && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7" onClick={copyResponse}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className={cn(
              "text-xs font-mono p-3 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto",
              responseStatus === 'success' && "bg-green-500/10 border border-green-500/20",
              responseStatus === 'error' && "bg-red-500/10 border border-red-500/20"
            )}>
              {response}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={clearForm}
        >
          Limpar
        </Button>
        <Button 
          size="sm" 
          className="flex-1 gap-2"
          onClick={handleTest}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Enviar
        </Button>
      </div>
    </div>
  );
}

