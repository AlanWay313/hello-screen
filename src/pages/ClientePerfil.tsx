import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Copy, 
  CheckCircle,
  Calendar,
  Building,
  UserCheck,
  UserX,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Key,
  RefreshCw,
  Activity,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import useIntegrador from "@/hooks/use-integrador";
import api from "@/services/api";

interface Cliente {
  nome: string;
  email: string;
  ole_contract_number: string;
  cpf_cnpj: string;
  contato: string;
  endereco_logradouro: string;
  endereco_cep: string;
  status?: string;
  estado?: string;
  cidade?: string;
  data_cadastro?: string;
  bairro?: string;
  numero?: string;
  complemento?: string;
}

// Skeleton de carregamento
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/50 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Skeleton className="h-28 w-28 rounded-2xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ClientePerfil() {
  const { documento } = useParams<{ documento: string }>();
  const navigate = useNavigate();
  const integrador = useIntegrador();
  
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  React.useEffect(() => {
    const fetchCliente = async () => {
      if (!integrador || !documento) return;
      
      setIsLoading(true);
      try {
        const result = await api.get("/src/clientes/listarclientes.php", {
          params: { idIntegra: integrador }
        });
        
        const clientes = result.data.data || [];
        const found = clientes.find((c: Cliente) => 
          c.cpf_cnpj?.replace(/\D/g, '') === documento?.replace(/\D/g, '')
        );
        
        if (found) {
          setCliente({
            ...found,
            status: found.email ? 'ativo' : 'inativo'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCliente();
  }, [integrador, documento]);

  const isPessoaJuridica = cliente?.cpf_cnpj?.length && cliente.cpf_cnpj.length > 14;
  const isAtivo = cliente?.status === 'ativo';

  const formatDocument = (doc: string) => {
    if (!doc) return '';
    if (doc.includes('.') || doc.includes('/')) return doc;
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const getFullAddress = () => {
    if (!cliente) return '';
    const parts = [
      cliente.endereco_logradouro,
      cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.estado,
    ].filter(Boolean);
    
    if (cliente.endereco_cep) {
      parts.push(`CEP: ${cliente.endereco_cep}`);
    }
    
    return parts.join(', ') || 'Endereço não informado';
  };

  if (isLoading) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Button variant="ghost" className="gap-2 mb-4" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Button>
        <ProfileSkeleton />
      </motion.div>
    );
  }

  if (!cliente) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground mb-6">O documento informado não foi encontrado no sistema.</p>
        <Button onClick={() => navigate('/clientes')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Botão Voltar */}
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para Clientes
      </Button>

      {/* Header do Perfil */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/50">
        {/* Background decorativo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar grande */}
            <motion.div 
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
                <span className="text-5xl font-bold text-white">
                  {cliente.nome?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg ${isAtivo ? 'bg-success' : 'bg-muted'}`}>
                {isAtivo ? (
                  <UserCheck className="h-4 w-4 text-white" />
                ) : (
                  <UserX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </motion.div>
            
            {/* Info Principal */}
            <div className="flex-1 space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold text-foreground">{cliente.nome}</h1>
                <p className="text-muted-foreground font-mono">{formatDocument(cliente.cpf_cnpj)}</p>
              </motion.div>
              
              <motion.div 
                className="flex flex-wrap items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Badge 
                  variant={isAtivo ? 'default' : 'secondary'}
                  className={`${isAtivo ? 'bg-success/10 text-success border-success/20' : ''} px-3 py-1`}
                >
                  {isAtivo ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1.5" /> Cliente Ativo</>
                  ) : (
                    <><UserX className="h-3.5 w-3.5 mr-1.5" /> Cliente Inativo</>
                  )}
                </Badge>
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  {isPessoaJuridica ? (
                    <><Building className="h-3.5 w-3.5" /> Pessoa Jurídica</>
                  ) : (
                    <><User className="h-3.5 w-3.5" /> Pessoa Física</>
                  )}
                </Badge>
                {cliente.ole_contract_number && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-mono">
                    <FileText className="h-3.5 w-3.5" />
                    Contrato: {cliente.ole_contract_number}
                  </Badge>
                )}
              </motion.div>
            </div>

            {/* Ações */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Gerenciar Cliente</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Edit className="h-4 w-4" />
                    Editar dados
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Key className="h-4 w-4" />
                    Resetar senha
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <RefreshCw className="h-4 w-4" />
                    Reintegrar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer"
                    onClick={() => navigate(`/logs?search=${cliente.cpf_cnpj}`)}
                  >
                    <Activity className="h-4 w-4" />
                    Ver logs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Contato */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50 h-full hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="group flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${cliente.email}`}
                      className="text-primary hover:underline truncate block"
                    >
                      {cliente.email || '-'}
                    </a>
                  </div>
                </div>
                {cliente.email && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(cliente.email, 'email')}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    {copiedField === 'email' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {/* Telefone */}
              <div className="group flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <a 
                      href={`tel:${cliente.contato}`}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {cliente.contato || '-'}
                    </a>
                  </div>
                </div>
                {cliente.contato && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(cliente.contato, 'telefone')}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    {copiedField === 'telefone' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card Documentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 h-full hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CPF/CNPJ */}
              <div className="group flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{isPessoaJuridica ? 'CNPJ' : 'CPF'}</p>
                    <span className="font-mono font-semibold text-foreground">{formatDocument(cliente.cpf_cnpj)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(cliente.cpf_cnpj, 'documento')}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedField === 'documento' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Contrato */}
              <div className="group flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nº Contrato</p>
                    <span className="font-mono font-semibold text-foreground">{cliente.ole_contract_number || '-'}</span>
                  </div>
                </div>
                {cliente.ole_contract_number && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(cliente.ole_contract_number, 'contrato')}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedField === 'contrato' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card Endereço */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 h-full hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <MapPin className="h-4 w-4 text-success" />
                </div>
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-xl space-y-2">
                <p className="text-foreground font-medium">{cliente.endereco_logradouro || 'Endereço não informado'}</p>
                {(cliente.bairro || cliente.cidade || cliente.estado) && (
                  <p className="text-sm text-muted-foreground">
                    {[cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(' - ')}
                  </p>
                )}
                {cliente.endereco_cep && (
                  <p className="text-sm text-muted-foreground font-mono">CEP: {cliente.endereco_cep}</p>
                )}
              </div>
              
              {cliente.endereco_logradouro && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddress())}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver no Google Maps
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Informações Adicionais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              {cliente.data_cadastro && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Cliente desde {new Date(cliente.data_cadastro).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
