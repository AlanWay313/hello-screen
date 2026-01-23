import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Book, 
  Users, 
  FileText, 
  Shield, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  Server,
  Key,
  AlertCircle,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import logoOletv from '@/assets/logo-oletv.png';

interface EndpointData {
  method: 'GET' | 'POST';
  url: string;
  description: string;
  section: string;
  urlParams?: { name: string; type: string; description: string; required?: boolean }[];
  postParams?: { name: string; type: string; description: string; required?: boolean }[];
  notes?: string[];
  response: string;
}

interface EndpointProps extends Omit<EndpointData, 'section'> {
  forceOpen?: boolean;
}

const Endpoint = ({ method, url, description, urlParams, postParams, notes, response, forceOpen }: EndpointProps) => {
  const [isOpen, setIsOpen] = useState(forceOpen || false);
  const [copied, setCopied] = useState(false);
  
  const isExpanded = forceOpen || isOpen;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono font-bold",
                method === 'POST' && "border-green-500/50 text-green-500 bg-green-500/10",
                method === 'GET' && "border-blue-500/50 text-blue-500 bg-blue-500/10"
              )}
            >
              {method}
            </Badge>
            <code className="text-sm font-mono text-foreground/80">{url}</code>
          </div>
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <Separator />

          {urlParams && urlParams.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                Parâmetros via URL
              </h4>
              <div className="space-y-2">
                {urlParams.map((param, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm pl-4 py-1 border-l-2 border-muted">
                    <code className="font-mono text-primary">{param.name}</code>
                    <span className="text-muted-foreground">({param.type})</span>
                    {param.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                    <span className="text-muted-foreground">- {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {postParams && postParams.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Parâmetros via POST (FormData)
              </h4>
              <div className="space-y-2">
                {postParams.map((param, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm pl-4 py-1 border-l-2 border-muted flex-wrap">
                    <code className="font-mono text-primary">{param.name}</code>
                    <span className="text-muted-foreground">({param.type})</span>
                    {param.required && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                    <span className="text-muted-foreground">- {param.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes && notes.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-4 w-4" />
                Observações
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Exemplo de Retorno
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(response)}
                className="h-7"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-xs font-mono">
              {response}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Section = ({ title, icon, children }: SectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
        {isOpen ? <ChevronDown className="h-5 w-5 ml-auto" /> : <ChevronRight className="h-5 w-5 ml-auto" />}
      </button>
      {isOpen && <div className="space-y-3 pl-12">{children}</div>}
    </div>
  );
};

export function ApiDocs() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const authParams = [
    { name: 'keyapi', type: 'string', description: 'Chave de acesso para validar o acesso', required: true },
    { name: 'login', type: 'string', description: 'Login do usuário', required: true },
    { name: 'pass', type: 'string', description: 'Senha do usuário', required: true },
  ];

  const allEndpoints: EndpointData[] = useMemo(() => [
    {
      section: 'Clientes',
      method: 'POST' as const,
      url: 'https://api.oletv.net.br/clientes/listar',
      description: 'Lista todos os clientes cadastrados',
      postParams: authParams,
      response: `{
  "retorno_status": true,
  "lista": [
    {
      "id": "9999",
      "nome": "Cliente 1",
      "cpf_cnpj": "999.999.999-99",
      "data_nascimento": "dd/mm/aaaa",
      "data_cadastro": "dd/mm/aaaa"
    }
  ]
}`
    },
    {
      section: 'Clientes',
      method: 'POST' as const,
      url: 'https://api.oletv.net.br/clientes/buscacpfcnpj/{cpf_cnpj}',
      description: 'Busca cliente por CPF/CNPJ',
      urlParams: [
        { name: 'cpf_cnpj', type: 'string', description: 'CPF/CNPJ (Formato: 999.999.999-99)', required: true }
      ],
      postParams: authParams,
      response: `{
  "retorno_status": true,
  "lista": [
    {
      "id": "9999",
      "nome": "Cliente 1",
      "cpf_cnpj": "999.999.999-99",
      "data_nascimento": "dd/mm/aaaa",
      "data_cadastro": "dd/mm/aaaa"
    }
  ]
}`
    },
    {
      section: 'Clientes',
      method: 'POST' as const,
      url: 'https://api.oletv.net.br/clientes/buscadados/{id_cliente}',
      description: 'Busca dados completos de um cliente',
      urlParams: [
        { name: 'id_cliente', type: 'inteiro', description: 'ID do Cliente', required: true }
      ],
      postParams: authParams,
      response: `{
  "retorno_status": true,
  "dados": {
    "id": "999999",
    "nome": "Cliente A",
    "tipo_pessoa": "Pessoa Física",
    "nome_fantasia": null,
    "cpf_cnpj": "999.999.999-99",
    "inscricao_estadual": null,
    "data_nascimento": "dd/mm/aaaa",
    "endereco": {
      "logradouro": "Rua A",
      "bairro": "Centro",
      "cidade": "Cidade",
      "estado_sigla": "UF",
      "numero": "999",
      "complemento": { "tipo": "", "valor": "" },
      "ponto_referencia": "Próximo Rua B",
      "cep": "99999-999"
    },
    "contato": "Contato A",
    "telefones": [
      { "ddd": "99", "numero": "99999-9999", "ramal": "", "tipo": "Celular" }
    ],
    "emails": [
      { "email": "email@dominio.com.br", "tipo": "Contato/News" }
    ],
    "dia_vencimento": "99",
    "status": "Ativo"
  }
}`
    },
    {
      section: 'Clientes',
      method: 'POST' as const,
      url: 'https://api.oletv.net.br/clientes/inserir',
      description: 'Insere um novo cliente',
      postParams: [
        ...authParams,
        { name: 'nome', type: 'string', description: 'Nome do cliente', required: true },
        { name: 'tipo_pessoa', type: 'string(1)', description: 'Tipo de Pessoa (F ou J)', required: true },
        { name: 'nome_fantasia', type: 'string', description: 'Nome fantasia (obrigatório p/PJ)', required: false },
        { name: 'cpf_cnpj', type: 'string', description: 'CPF: 999.999.999-99 ou CNPJ: 99.999.999/9999-99', required: true },
        { name: 'data_nascimento', type: 'string(10)', description: 'Data Nascimento: dd/mm/aaaa (obrigatório p/PF)', required: false },
        { name: 'endereco_cep', type: 'string(9)', description: 'CEP: 99999-999', required: true },
        { name: 'endereco_logradouro', type: 'string', description: 'Rua, avenida, travessa...', required: false },
        { name: 'endereco_numero', type: 'string', description: 'Número do endereço', required: false },
        { name: 'endereco_bairro', type: 'string', description: 'Nome do bairro', required: false },
        { name: 'telefone_ddd[]', type: 'int(2)', description: 'DDD do telefone: 99', required: false },
        { name: 'telefone_numero[]', type: 'string(10)', description: 'Número do telefone: 99999-9999', required: false },
        { name: 'email[]', type: 'string', description: 'E-mail de contato', required: false },
        { name: 'dia_vencimento', type: 'int(2)', description: 'Dia vencimento do boleto', required: true },
        { name: 'endereco_cobranca', type: 'boolean', description: 'true = Mesmo endereço, false = Diferente', required: true },
      ],
      notes: [
        'Os parâmetros de telefone e e-mail com "[]" podem ser repetidos quantas vezes forem necessárias.',
        'Os dados do endereço de cobrança só precisam ser informados se endereco_cobranca = false.'
      ],
      response: `{
  "retorno_status": true,
  "msg": "Cliente inserido com sucesso!",
  "id": 99999
}`
    },
    {
      section: 'Clientes',
      method: 'POST' as const,
      url: 'https://api.oletv.net.br/clientes/alterar/{id_cliente}',
      description: 'Altera dados de um cliente existente',
      urlParams: [
        { name: 'id_cliente', type: 'inteiro', description: 'ID do cliente', required: true }
      ],
      postParams: [
        ...authParams,
        { name: 'nome', type: 'string', description: 'Nome do cliente', required: true },
        { name: 'tipo_pessoa', type: 'string(1)', description: 'Tipo de Pessoa', required: true },
        { name: 'cpf_cnpj', type: 'string', description: 'CPF ou CNPJ', required: true },
        { name: 'dia_vencimento', type: 'int(2)', description: 'Dia vencimento do boleto', required: true },
        { name: 'endereco_cobranca', type: 'boolean', description: 'true = Mesmo endereço', required: true },
      ],
      notes: [
        'Os parâmetros de telefone e e-mail com "[]" podem ser repetidos quantas vezes forem necessárias.',
        'Os dados do endereço de cobrança só precisam ser informados se endereco_cobranca = false.'
      ],
      response: `{
  "retorno_status": true,
  "msg": "Cliente alterado com sucesso!"
}`
    },
  ], [authParams]);

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return allEndpoints.filter(endpoint => 
      endpoint.url.toLowerCase().includes(query) ||
      endpoint.description.toLowerCase().includes(query) ||
      endpoint.section.toLowerCase().includes(query) ||
      endpoint.postParams?.some(p => p.name.toLowerCase().includes(query)) ||
      endpoint.urlParams?.some(p => p.name.toLowerCase().includes(query))
    );
  }, [searchQuery, allEndpoints]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={logoOletv} alt="OleTV" className="h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold">API OleTV</h1>
                <p className="text-sm text-muted-foreground">Documentação de Integração</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar endpoints, parâmetros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-background/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Search Results */}
        {isSearching && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5" />
                Resultados da busca
                <Badge variant="secondary">{filteredEndpoints?.length || 0}</Badge>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Limpar busca
              </Button>
            </div>
            
            {filteredEndpoints && filteredEndpoints.length > 0 ? (
              <div className="space-y-3">
                {filteredEndpoints.map((endpoint, idx) => (
                  <div key={idx}>
                    <Badge variant="outline" className="mb-2 text-xs">{endpoint.section}</Badge>
                    <Endpoint
                      method={endpoint.method}
                      url={endpoint.url}
                      description={endpoint.description}
                      urlParams={endpoint.urlParams}
                      postParams={endpoint.postParams}
                      notes={endpoint.notes}
                      response={endpoint.response}
                      forceOpen={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum endpoint encontrado para "{searchQuery}"</p>
              </Card>
            )}
            
            <Separator className="my-8" />
          </div>
        )}

        {/* Introdução */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Introdução
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Seja bem-vindo à documentação da API de comunicação com o sistema de gerenciamento 
              da IPTV da Olé! Nossa API foi criada utilizando o padrão REST que possibilita a 
              integração de seu sistema ao nosso.
            </p>
            <p>
              Você pode extender ou recriar as funcionalidades existentes na plataforma, 
              consumindo a API documentada abaixo.
            </p>
          </CardContent>
        </Card>

        {/* Autenticação */}
        <Card className="mb-8 bg-amber-500/5 border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Shield className="h-5 w-5" />
              Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para qualquer requisição da API, você precisa informar através do método POST os dados de autenticação:
            </p>
            <div className="space-y-2">
              {authParams.map((param, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm pl-4 py-1 border-l-2 border-amber-500/30">
                  <code className="font-mono text-amber-500">{param.name}</code>
                  <span className="text-muted-foreground">({param.type})</span>
                  <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Resposta de erro de autenticação:</p>
              <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono">
{`{
  "retorno_status": false,
  "error": "Dados de autenticação são inválidos!"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Atualizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { date: '06/04/2023', text: 'Adicionado o método pontosregistrados para obter todos os pontos registrados do cliente' },
                { date: '23/03/2023', text: 'Adicionado ao efetuar um bloqueio com sucesso, o retorno do ID do bloqueio gerado' },
                { date: '04/04/2023', text: 'Ajustado a listagem de planos para retornar somente os planos que o parceiro pode comercializar' },
                { date: '22/08/2022', text: 'Validação da padronização da comunicação para trabalhar sempre com a codificação UTF-8' },
                { date: '01/08/2022', text: 'Bloqueio/Desbloqueio de Contrato - Novos parâmetros motivo_suspensao' },
                { date: '14/12/2021', text: 'Adicionado a busca de boletos por um contrato' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <Badge variant="outline" className="font-mono shrink-0">{item.date}</Badge>
                  <span className="text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Endpoints */}
        <div className="space-y-8">
          <Section title="Clientes" icon={<Users className="h-5 w-5" />}>
            <Endpoint
              method="POST"
              url="https://api.oletv.net.br/clientes/listar"
              description="Lista todos os clientes cadastrados"
              postParams={authParams}
              response={`{
  "retorno_status": true,
  "lista": [
    {
      "id": "9999",
      "nome": "Cliente 1",
      "cpf_cnpj": "999.999.999-99",
      "data_nascimento": "dd/mm/aaaa",
      "data_cadastro": "dd/mm/aaaa"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              url="https://api.oletv.net.br/clientes/buscacpfcnpj/{cpf_cnpj}"
              description="Busca cliente por CPF/CNPJ"
              urlParams={[
                { name: 'cpf_cnpj', type: 'string', description: 'CPF/CNPJ (Formato: 999.999.999-99)', required: true }
              ]}
              postParams={authParams}
              response={`{
  "retorno_status": true,
  "lista": [
    {
      "id": "9999",
      "nome": "Cliente 1",
      "cpf_cnpj": "999.999.999-99",
      "data_nascimento": "dd/mm/aaaa",
      "data_cadastro": "dd/mm/aaaa"
    }
  ]
}`}
            />

            <Endpoint
              method="POST"
              url="https://api.oletv.net.br/clientes/buscadados/{id_cliente}"
              description="Busca dados completos de um cliente"
              urlParams={[
                { name: 'id_cliente', type: 'inteiro', description: 'ID do Cliente', required: true }
              ]}
              postParams={authParams}
              response={`{
  "retorno_status": true,
  "dados": {
    "id": "999999",
    "nome": "Cliente A",
    "tipo_pessoa": "Pessoa Física",
    "nome_fantasia": null,
    "cpf_cnpj": "999.999.999-99",
    "inscricao_estadual": null,
    "data_nascimento": "dd/mm/aaaa",
    "endereco": {
      "logradouro": "Rua A",
      "bairro": "Centro",
      "cidade": "Cidade",
      "estado_sigla": "UF",
      "numero": "999",
      "complemento": { "tipo": "", "valor": "" },
      "ponto_referencia": "Próximo Rua B",
      "cep": "99999-999"
    },
    "contato": "Contato A",
    "telefones": [
      { "ddd": "99", "numero": "99999-9999", "ramal": "", "tipo": "Celular" }
    ],
    "emails": [
      { "email": "email@dominio.com.br", "tipo": "Contato/News" }
    ],
    "dia_vencimento": "99",
    "status": "Ativo"
  }
}`}
            />

            <Endpoint
              method="POST"
              url="https://api.oletv.net.br/clientes/inserir"
              description="Insere um novo cliente"
              postParams={[
                ...authParams,
                { name: 'nome', type: 'string', description: 'Nome do cliente', required: true },
                { name: 'tipo_pessoa', type: 'string(1)', description: 'Tipo de Pessoa (F ou J)', required: true },
                { name: 'nome_fantasia', type: 'string', description: 'Nome fantasia (obrigatório p/PJ)', required: false },
                { name: 'cpf_cnpj', type: 'string', description: 'CPF: 999.999.999-99 ou CNPJ: 99.999.999/9999-99', required: true },
                { name: 'data_nascimento', type: 'string(10)', description: 'Data Nascimento: dd/mm/aaaa (obrigatório p/PF)', required: false },
                { name: 'endereco_cep', type: 'string(9)', description: 'CEP: 99999-999', required: true },
                { name: 'endereco_logradouro', type: 'string', description: 'Rua, avenida, travessa...', required: false },
                { name: 'endereco_numero', type: 'string', description: 'Número do endereço', required: false },
                { name: 'endereco_bairro', type: 'string', description: 'Nome do bairro', required: false },
                { name: 'telefone_ddd[]', type: 'int(2)', description: 'DDD do telefone: 99', required: false },
                { name: 'telefone_numero[]', type: 'string(10)', description: 'Número do telefone: 99999-9999', required: false },
                { name: 'email[]', type: 'string', description: 'E-mail de contato', required: false },
                { name: 'dia_vencimento', type: 'int(2)', description: 'Dia vencimento do boleto', required: true },
                { name: 'endereco_cobranca', type: 'boolean', description: 'true = Mesmo endereço, false = Diferente', required: true },
              ]}
              notes={[
                'Os parâmetros de telefone e e-mail com "[]" podem ser repetidos quantas vezes forem necessárias.',
                'Os dados do endereço de cobrança só precisam ser informados se endereco_cobranca = false.'
              ]}
              response={`{
  "retorno_status": true,
  "msg": "Cliente inserido com sucesso!",
  "id": 99999
}`}
            />

            <Endpoint
              method="POST"
              url="https://api.oletv.net.br/clientes/alterar/{id_cliente}"
              description="Altera dados de um cliente existente"
              urlParams={[
                { name: 'id_cliente', type: 'inteiro', description: 'ID do cliente', required: true }
              ]}
              postParams={[
                ...authParams,
                { name: 'nome', type: 'string', description: 'Nome do cliente', required: true },
                { name: 'tipo_pessoa', type: 'string(1)', description: 'Tipo de Pessoa', required: true },
                { name: 'cpf_cnpj', type: 'string', description: 'CPF ou CNPJ', required: true },
                { name: 'dia_vencimento', type: 'int(2)', description: 'Dia vencimento do boleto', required: true },
                { name: 'endereco_cobranca', type: 'boolean', description: 'true = Mesmo endereço', required: true },
              ]}
              notes={[
                'Os parâmetros de telefone e e-mail com "[]" podem ser repetidos quantas vezes forem necessárias.',
                'Os dados do endereço de cobrança só precisam ser informados se endereco_cobranca = false.'
              ]}
              response={`{
  "retorno_status": true,
  "msg": "Cliente alterado com sucesso!"
}`}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>Documentação API OleTV - Uso interno</p>
        </div>
      </main>
    </div>
  );
}
