import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Loader2, User, Mail, Phone, MapPin, Calendar, FileText } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

export default function EditarCliente({ data, listarClientes }: any) {
  const [id] = useState(data.id);
  const [nome, setNome] = useState(data.nome);
  const [cpfCnpj, setCpfCnpj] = useState(data.cpf_cnpj);
  const [email, setEmail] = useState(data.email);
  const [telefoneDDD, setTelefoneDDD] = useState(data.telefone_ddd);
  const [telefoneNumero, setTelefoneNumero] = useState(data.telefone_numero);
  const [enderecoCEP, setEnderecoCEP] = useState(data.endereco_cep);
  const [enderecoLogradouro, setEnderecoLogradouro] = useState(data.endereco_logradouro);
  const [enderecoNumero, setEnderecoNumero] = useState(data.endereco_numero);
  const [enderecoBairro, setEnderecoBairro] = useState(data.endereco_bairro);
  const [data_nascimento, setDataNascimento] = useState(data.data_nascimento);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { toast }: any = useToast();

  const handleEdit = async () => {
    const formData = {
      id,
      nome,
      cpf_cnpj: cpfCnpj,
      email,
      telefone_ddd: telefoneDDD,
      telefone_numero: telefoneNumero,
      endereco_cep: enderecoCEP,
      endereco_logradouro: enderecoLogradouro,
      endereco_numero: enderecoNumero,
      endereco_bairro: enderecoBairro,
      cobranca_logradouro: enderecoLogradouro,
      cobranca_numero: enderecoNumero,
      cobranca_bairro: enderecoBairro,
      data_nascimento: data_nascimento
    };

    try {
      setLoading(true);
      const response = await api.put(`/src/models/EditarClienteOle.php`, formData);

      toast({
        title: "Cliente atualizado",
        description: response.data.message || "Dados salvos com sucesso!",
      });

      await listarClientes();
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao editar cliente:", error);
      toast({
        title: "Erro ao editar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
          <Pencil className="h-4 w-4 text-primary" />
          <span>Editar Cliente</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Editar Cliente</DialogTitle>
              <DialogDescription className="text-sm">
                Atualize os dados de {data.nome}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </h3>
            
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-xs">Nome completo</Label>
                <Input 
                  id="nome"
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    CPF/CNPJ
                  </Label>
                  <Input 
                    id="cpf"
                    value={cpfCnpj} 
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nascimento" className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data de Nascimento
                  </Label>
                  <Input 
                    id="nascimento"
                    value={data_nascimento} 
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contato
            </h3>
            
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input 
                id="email"
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ddd" className="text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  DDD
                </Label>
                <Input 
                  id="ddd"
                  value={telefoneDDD} 
                  onChange={(e) => setTelefoneDDD(e.target.value)}
                  className="h-9 text-center"
                  maxLength={2}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="telefone" className="text-xs">Telefone</Label>
                <Input 
                  id="telefone"
                  value={telefoneNumero} 
                  onChange={(e) => setTelefoneNumero(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cep" className="text-xs">CEP</Label>
                <Input 
                  id="cep"
                  value={enderecoCEP} 
                  onChange={(e) => setEnderecoCEP(e.target.value)}
                  className="h-9 font-mono"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="bairro" className="text-xs">Bairro</Label>
                <Input 
                  id="bairro"
                  value={enderecoBairro} 
                  onChange={(e) => setEnderecoBairro(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1.5">
                <Label htmlFor="logradouro" className="text-xs">Logradouro</Label>
                <Input 
                  id="logradouro"
                  value={enderecoLogradouro} 
                  onChange={(e) => setEnderecoLogradouro(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numero" className="text-xs">Nº</Label>
                <Input 
                  id="numero"
                  value={enderecoNumero} 
                  onChange={(e) => setEnderecoNumero(e.target.value)}
                  className="h-9 text-center"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleEdit}
            disabled={loading}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}