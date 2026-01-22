import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, X, Filter, AlertTriangle, MapPin, Ban, CreditCard, User, FileX, AlertCircle } from "lucide-react";
import useIntegrador from "@/hooks/use-integrador";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "../ui/skeleton";
import api from "@/services/api";

// Interface para tipagem dos logs
interface LogEntry {
  id: string;
  acao: string;
  codeLog: string;
  created_at: string;
  id_cliente: string;
}

// Mapeamento de palavras-chave de erro
interface ErrorMapping {
  keywords: string[];
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
}

const errorMappings: ErrorMapping[] = [
  {
    keywords: ["cep", "cep do endereço", "endereço", "endereco", "logradouro", "cidade", "estado", "uf"],
    label: "CEP/Endereço",
    description: "Problema com CEP ou dados de endereço inválidos",
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
  {
    keywords: ["bloqueio", "bloqueado", "blocked", "suspenso", "suspensão", "inativo"],
    label: "Bloqueio",
    description: "Cliente ou contrato bloqueado/suspenso",
    icon: Ban,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  {
    keywords: ["cpf", "cnpj", "documento", "cpf inválido", "cnpj inválido", "documento inválido"],
    label: "Documento",
    description: "CPF ou CNPJ inválido ou não encontrado",
    icon: FileX,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  {
    keywords: ["pagamento", "inadimplente", "débito", "cobrança", "fatura", "boleto"],
    label: "Financeiro",
    description: "Problema financeiro ou inadimplência",
    icon: CreditCard,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
  },
  {
    keywords: ["cliente não encontrado", "não encontrado", "not found", "inexistente"],
    label: "Não Encontrado",
    description: "Cliente não localizado no sistema",
    icon: User,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
  },
  {
    keywords: ["timeout", "conexão", "conexao", "erro de rede", "network", "servidor"],
    label: "Conexão",
    description: "Erro de conexão ou timeout",
    icon: AlertCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    keywords: ["contrato", "plano", "pacote", "assinatura"],
    label: "Contrato",
    description: "Problema com dados do contrato",
    icon: FileX,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
];

// Função para detectar erros no log
function detectErrors(logText: string): ErrorMapping[] {
  const lowerText = logText.toLowerCase();
  const detectedErrors: ErrorMapping[] = [];

  for (const mapping of errorMappings) {
    const hasKeyword = mapping.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    if (hasKeyword && !detectedErrors.find(e => e.label === mapping.label)) {
      detectedErrors.push(mapping);
    }
  }

  return detectedErrors;
}

export default function LogIndividual({ open, onClose, cliente }: any) {
  const [data, setData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para filtros
  const [filtroCliente, setFiltroCliente] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroErro, setFiltroErro] = useState<string | null>(null);
  
  const integra: any = useIntegrador();

  useEffect(() => {
    async function handleLogs() {
      setLoading(true);
      try {
        const result = await api.get(
          "src/services/LogsDistintosClientes.php",
          {
            params: { idIntegra: integra },
          }
        );

        // Filtra os logs com base no CPF do cliente
        const logsFiltrados = result.data.data.filter(
          (log: LogEntry) => log.id_cliente === cliente?.cpf_cnpj
        );

        setData(logsFiltrados);
      } catch (error) {
        console.log("Erro ao buscar logs:", error);
      } finally {
        setLoading(false);
      }
    }

    if (open && cliente) {
      handleLogs();
    }
  }, [open, cliente, integra]);

  // Função auxiliar para criar data local sem problemas de fuso horário
  const criarDataLocal = (dataString: string, isEndOfDay = false) => {
    if (!dataString) return null;
    
    const [ano, mes, dia] = dataString.split('-').map(Number);
    
    const data = isEndOfDay 
      ? new Date(ano, mes - 1, dia, 23, 59, 59, 999)
      : new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    
    return data;
  };

  // Função auxiliar para formatar data para exibição
  const formatarDataParaExibicao = (dataString: string) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Estatísticas de erros detectados
  const errorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    data.forEach(log => {
      const errors = detectErrors(`${log.acao} ${log.codeLog}`);
      errors.forEach(error => {
        stats[error.label] = (stats[error.label] || 0) + 1;
      });
    });

    return stats;
  }, [data]);

  // Função para filtrar os dados
  const dadosFiltrados = useMemo(() => {
    return data.filter((log) => {
      // Filtro por cliente (busca na ação ou código do log)
      const passaFiltroCliente = !filtroCliente || 
        log.acao.toLowerCase().includes(filtroCliente.toLowerCase()) ||
        log.codeLog.toLowerCase().includes(filtroCliente.toLowerCase());

      // Filtro por data - usando função auxiliar
      const dataLog = new Date(log.created_at);
      
      let passaFiltroData = true;
      
      if (dataInicio) {
        const dataInicioObj = criarDataLocal(dataInicio, false);
        if (dataInicioObj) {
          passaFiltroData = passaFiltroData && dataLog >= dataInicioObj;
        }
      }
      
      if (dataFim) {
        const dataFimObj = criarDataLocal(dataFim, true);
        if (dataFimObj) {
          passaFiltroData = passaFiltroData && dataLog <= dataFimObj;
        }
      }

      // Filtro por tipo de erro
      let passaFiltroErro = true;
      if (filtroErro) {
        const errors = detectErrors(`${log.acao} ${log.codeLog}`);
        passaFiltroErro = errors.some(e => e.label === filtroErro);
      }

      return passaFiltroCliente && passaFiltroData && passaFiltroErro;
    });
  }, [data, filtroCliente, dataInicio, dataFim, filtroErro]);

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltroCliente("");
    setDataInicio("");
    setDataFim("");
    setFiltroErro(null);
  };

  // Verifica se há filtros ativos
  const temFiltrosAtivos = filtroCliente || dataInicio || dataFim || filtroErro;

  // Reset dos filtros quando o modal fecha
  useEffect(() => {
    if (!open) {
      limparFiltros();
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[650px] overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                Logs para {cliente?.nome}
              </SheetTitle>
              <SheetDescription>
                Histórico de logs e erros de integração
                {dadosFiltrados.length !== data.length && (
                  <span className="text-primary font-medium">
                    {" "}({dadosFiltrados.length} de {data.length} registros)
                  </span>
                )}
              </SheetDescription>
            </div>
            <Button
              variant={mostrarFiltros ? "default" : "outline"}
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </SheetHeader>

        {/* Resumo de Erros Detectados */}
        {!loading && Object.keys(errorStats).length > 0 && (
          <div className="py-4 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Erros Detectados
            </p>
            <div className="flex flex-wrap gap-2">
              {errorMappings.filter(m => errorStats[m.label]).map((mapping) => {
                const Icon = mapping.icon;
                const isActive = filtroErro === mapping.label;
                return (
                  <button
                    key={mapping.label}
                    onClick={() => setFiltroErro(isActive ? null : mapping.label)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                      border transition-all duration-200
                      ${isActive 
                        ? `${mapping.bgColor} ${mapping.color} ring-2 ring-offset-1` 
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                      }
                    `}
                    title={mapping.description}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mapping.label}
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {errorStats[mapping.label]}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Área de Filtros */}
        {mostrarFiltros && (
          <div className="py-4 border-b border-border space-y-4 bg-secondary/30 -mx-6 px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filtros Avançados</h3>
              {temFiltrosAtivos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Filtro por cliente/ação */}
            <div className="space-y-2">
              <Label htmlFor="filtro-cliente" className="text-sm">
                Buscar por ação ou código
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="filtro-cliente"
                  placeholder="Digite para buscar..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtros de data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-inicio" className="text-sm">
                  Data início
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-fim" className="text-sm">
                  Data fim
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Informações dos filtros ativos */}
            {temFiltrosAtivos && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/20">
                <strong>Filtros ativos:</strong>
                {filtroCliente && <span className="ml-2">Busca: "{filtroCliente}"</span>}
                {dataInicio && (
                  <span className="ml-2">
                    De: {formatarDataParaExibicao(dataInicio)}
                  </span>
                )}
                {dataFim && (
                  <span className="ml-2">
                    Até: {formatarDataParaExibicao(dataFim)}
                  </span>
                )}
                {filtroErro && (
                  <span className="ml-2">Tipo: {filtroErro}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista de Logs */}
        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-xl">
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-4 w-[50%]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {dadosFiltrados.length > 0 ? (
                dadosFiltrados.map((log) => {
                  const detectedErrors = detectErrors(`${log.acao} ${log.codeLog}`);
                  
                  return (
                    <div 
                      key={log.id} 
                      className={`
                        p-4 border rounded-xl transition-colors
                        ${detectedErrors.length > 0 
                          ? detectedErrors[0].bgColor 
                          : 'bg-card hover:bg-secondary/30'
                        }
                      `}
                    >
                      {/* Error Tags */}
                      {detectedErrors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {detectedErrors.map((error) => {
                            const Icon = error.icon;
                            return (
                              <Badge 
                                key={error.label}
                                variant="outline" 
                                className={`${error.color} border-current/30 gap-1`}
                              >
                                <Icon className="h-3 w-3" />
                                {error.label}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Ação:</span>
                          <p className="font-medium text-foreground">{log.acao}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Código:</span>
                          <p className="font-mono text-primary text-xs break-all">{log.codeLog}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  {data.length === 0 ? (
                    <div>
                      <div className="text-4xl mb-3">📋</div>
                      <p className="font-medium text-foreground">Nenhum log encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        Este cliente ainda não possui logs registrados.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-medium text-foreground">Nenhum resultado encontrado</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tente ajustar os filtros para ver mais resultados.
                      </p>
                      {temFiltrosAtivos && (
                        <Button variant="outline" size="sm" onClick={limparFiltros}>
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com estatísticas */}
        {!loading && data.length > 0 && (
          <div className="pt-4 border-t border-border text-sm text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>
                {dadosFiltrados.length === data.length 
                  ? `${data.length} registros totais`
                  : `${dadosFiltrados.length} de ${data.length} registros`
                }
              </span>
              {dadosFiltrados.length > 0 && (
                <span className="text-xs">
                  Último: {new Date(dadosFiltrados[0]?.created_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
