import * as React from "react";
import { 
  X, 
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
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

export function ClientProfileModal({ isOpen, onClose, cliente }: ClientProfileModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);

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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !cliente) return null;

  const isPessoaJuridica = cliente.cpf_cnpj?.length > 14;
  const isAtivo = cliente.status === 'ativo';

  const formatDocument = (doc: string) => {
    if (!doc) return '';
    // Já formatado
    if (doc.includes('.') || doc.includes('/')) return doc;
    // CPF
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    // CNPJ
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  const getFullAddress = () => {
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-card border border-border rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Avatar e Info Principal */}
        <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 border-b border-border">
          {/* Background decorativo */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar grande */}
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-3xl font-bold text-white">
                  {cliente.nome?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{cliente.nome}</h2>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={isAtivo ? 'default' : 'secondary'}
                    className={isAtivo ? 'bg-success/10 text-success border-success/20' : ''}
                  >
                    {isAtivo ? (
                      <><UserCheck className="h-3 w-3 mr-1" /> Ativo</>
                    ) : (
                      <><UserX className="h-3 w-3 mr-1" /> Inativo</>
                    )}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    {isPessoaJuridica ? (
                      <><Building className="h-3 w-3" /> Pessoa Jurídica</>
                    ) : (
                      <><User className="h-3 w-3" /> Pessoa Física</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Grid de informações principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contrato */}
            <div className="group p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Contrato
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(cliente.ole_contract_number, 'contrato')}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedField === 'contrato' ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <span className="font-mono text-lg font-semibold text-foreground">{cliente.ole_contract_number || '-'}</span>
            </div>

            {/* Documento */}
            <div className="group p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {isPessoaJuridica ? 'CNPJ' : 'CPF'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(cliente.cpf_cnpj, 'documento')}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedField === 'documento' ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <span className="font-mono text-lg font-semibold text-foreground">{formatDocument(cliente.cpf_cnpj) || '-'}</span>
            </div>
          </div>

          <Separator />

          {/* Informações de Contato */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Informações de Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="group p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </p>
                <div className="flex items-center gap-2">
                  <a 
                    href={`mailto:${cliente.email}`}
                    className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium truncate"
                  >
                    {cliente.email || '-'}
                  </a>
                  {cliente.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(cliente.email, 'email')}
                      className="h-6 w-6 shrink-0"
                    >
                      {copiedField === 'email' ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Telefone */}
              <div className="group p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Telefone
                </p>
                <div className="flex items-center gap-2">
                  <a 
                    href={`tel:${cliente.contato}`}
                    className="text-foreground hover:text-primary transition-colors font-medium"
                  >
                    {cliente.contato || '-'}
                  </a>
                  {cliente.contato && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(cliente.contato, 'telefone')}
                      className="h-6 w-6 shrink-0"
                    >
                      {copiedField === 'telefone' ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Endereço
            </h3>
            <div className="group p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
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
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddress())}`, '_blank')}
                    className="shrink-0 gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver no mapa
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Data de cadastro */}
          {cliente.data_cadastro && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Cliente desde {new Date(cliente.data_cadastro).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
