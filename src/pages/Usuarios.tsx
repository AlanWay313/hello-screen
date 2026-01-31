import { CriarUsuarios } from "@/components/criarusuarios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeletarUsuario } from "@/components/deletarusuario";
import useIntegrador from "@/hooks/use-integrador";
import api from "@/services/api";

import { useEffect, useState, useRef } from "react";
import { 
  EllipsisVertical, 
  Pencil, 
  Trash, 
  Search, 
  Filter,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Save,
  X,
  Loader2,
  Info,
  Mail,
  User,
  Shield,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  isActive: number;
}

interface EditUserForm {
  name: string;
  email: string;
  username: string;
  isActive: number;
  password?: string;
}

function normalizeUser(raw: any): User {
  const id =
    raw?.id ??
    raw?.ID ??
    raw?.IDUSER ??
    raw?.userId ??
    raw?.idUser ??
    raw?.id_usuario ??
    raw?.ID_USUARIO ??
    raw?.idUsuario ??
    raw?.codigo ??
    raw?.CODIGO ??
    "";

  const name = raw?.name ?? raw?.NAME ?? raw?.nome ?? "";
  const email = raw?.email ?? raw?.EMAIL ?? "";
  const username = raw?.username ?? raw?.USERNAME ?? raw?.user ?? raw?.login ?? "";

  const rawActive = raw?.isActive ?? raw?.ACTIVE ?? raw?.active ?? raw?.ativo;
  const isActive =
    typeof rawActive === "boolean"
      ? rawActive
        ? 1
        : 0
      : Number(rawActive ?? 1) || 0;

  return {
    id: String(id),
    name: String(name),
    email: String(email),
    username: String(username),
    isActive,
  };
}

// Modal customizado com suporte a dark mode
const CustomModal = ({ 
  isOpen, 
  onClose, 
  children,
  title,
  description
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  description?: string;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Garante que o “fundo” fique no topo quando o modal abre (scroll da página)
      // e também reseta o scroll interno do modal (quando há overflow)
      const scrollRoot = (document.scrollingElement || document.documentElement) as HTMLElement;
      // Faz antes de bloquear overflow para não depender do comportamento do browser
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        scrollRoot.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {
        // noop
      }

      // Bloqueia scroll do fundo
      document.body.style.overflow = 'hidden';

      // Reseta scroll do conteúdo do modal
      requestAnimationFrame(() => {
        modalRef.current?.querySelector<HTMLElement>("[data-modal-body]")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-card border border-border rounded-2xl shadow-elevated max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div data-modal-body className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Edição
const EditUserModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated 
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}) => {
  const [formData, setFormData] = useState<EditUserForm>({
    name: '',
    email: '',
    username: '',
    isActive: 1,
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<EditUserForm>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        password: ''
      });
      setErrors({});
    }
  }, [user, isOpen]);

  const handleInputChange = (field: keyof EditUserForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EditUserForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Nome de usuário é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    if (!user.id || user.id === "undefined" || user.id === "null") {
      toast({
        title: "Editar usuário",
        description:
          "Não foi possível identificar o usuário (ID ausente). Recarregue a lista e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        // O backend de edição recebe o ID via querystring (?id=...) e os demais campos no body.
        name: formData.name,
        email: formData.email,
        username: formData.username,
        isActive: formData.isActive,
        ...(formData.password && { password: formData.password })
      };

      // Importante: o endpoint PHP valida o ID pela URL.
      const response = await api.put(`/src/services/EditarUsuario.php?id=${encodeURIComponent(user.id)}`, updateData);

      const statusCode = Number(response?.data?.status);

      if (statusCode === 200) {
        toast({
          title: "Usuário atualizado",
          description: response?.data?.message || "Os dados do usuário foram atualizados com sucesso.",
          variant: "default",
        });
        
        onUserUpdated();
        handleClose();
      } else {
        throw new Error(response?.data?.message || 'Erro ao atualizar usuário');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro interno do servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setFormData({
      name: '',
      email: '',
      username: '',
      isActive: 1,
      password: ''
    });
    setErrors({});
    
    onClose();
  };

  if (!user) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Usuário"
      description="Altere as informações do usuário"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Nome completo *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Digite o nome completo"
            disabled={isLoading}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Digite o email"
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            Nome de usuário *
          </Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Digite o nome de usuário"
            disabled={isLoading}
            className="font-mono"
          />
          {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            Nova senha
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Deixe em branco para manter a senha atual</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Deixe em branco para manter atual"
            disabled={isLoading}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.isActive.toString()}
            onValueChange={(value) => handleInputChange('isActive', parseInt(value))}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-success" />
                  Ativo
                </div>
              </SelectItem>
              <SelectItem value="0">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" />
                  Inativo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};

export function Usuarios() {
  const [data, setData] = useState<User[]>([]);
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const integra: any = useIntegrador();

  const listarUsuarios = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.get(
        `src/services/ListarUsuarios.php?idIntegra=${integra}`,
      );

      if (result?.data?.data) {
        const normalized = Array.isArray(result.data.data)
          ? result.data.data.map(normalizeUser)
          : [];

        setData(normalized);
        setFilteredData(normalized);
      } else {
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      setError("Erro ao carregar usuários. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleUserUpdated = () => {
    listarUsuarios();
  };

  useEffect(() => {
    let filtered = data;

    if (searchTerm.trim()) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeFilter !== "all") {
      filtered = filtered.filter(user => 
        activeFilter === "active" ? user.isActive === 1 : user.isActive !== 1
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtrar
  }, [data, searchTerm, activeFilter]);

  useEffect(() => {
    listarUsuarios();
  }, []);

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const activeUsers = data.filter(user => user.isActive === 1).length;
  const inactiveUsers = data.filter(user => user.isActive !== 1).length;

  const handleRefresh = () => {
    listarUsuarios();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header da Página */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os usuários com acesso ao sistema
            </p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border shadow-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Todos os usuários cadastrados que podem acessar o sistema</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-foreground">{data.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Usuários com credenciais de acesso
              </p>
            </CardContent>
          </Card>

          <Card className="border-success/20 shadow-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-success/10 to-transparent">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usuários que podem fazer login e utilizar o sistema</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="p-2 bg-success/10 rounded-lg">
                <UserCheck className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-success">{activeUsers}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${data.length > 0 ? (activeUsers / data.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {data.length > 0 ? `${Math.round((activeUsers / data.length) * 100)}%` : "0%"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-destructive/10 to-transparent">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usuários desativados que não podem acessar o sistema</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <UserX className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-destructive">{inactiveUsers}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all"
                    style={{ width: `${data.length > 0 ? (inactiveUsers / data.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {data.length > 0 ? `${Math.round((inactiveUsers / data.length) * 100)}%` : "0%"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles e Filtros */}
        <Card className="border-border shadow-card">
          <CardHeader className="border-b border-border bg-gradient-to-r from-muted/50 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Visualize, edite e gerencie as permissões de acesso
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recarregar lista de usuários</p>
                  </TooltipContent>
                </Tooltip>
                <CriarUsuarios listarUsuarios={listarUsuarios} />
              </div>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("all")}
                    >
                      Todos ({data.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mostrar todos os usuários</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("active")}
                      className={activeFilter === "active" ? "bg-success hover:bg-success/90" : ""}
                    >
                      Ativos ({activeUsers})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtrar apenas usuários ativos</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeFilter === "inactive" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("inactive")}
                      className={activeFilter === "inactive" ? "bg-destructive hover:bg-destructive/90" : ""}
                    >
                      Inativos ({inactiveUsers})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtrar apenas usuários inativos</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Estado de Loading */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
                <span className="text-muted-foreground">Carregando usuários...</span>
              </div>
            ) : error ? (
              /* Estado de Erro */
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-destructive/10 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <span className="text-destructive font-medium mb-2">{error}</span>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Tentar novamente
                </Button>
              </div>
            ) : filteredData.length === 0 ? (
              /* Estado Vazio */
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Users className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {searchTerm || activeFilter !== "all" ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </p>
                <p className="text-sm text-center max-w-md">
                  {searchTerm || activeFilter !== "all" 
                    ? "Tente ajustar os filtros de busca ou limpar os critérios" 
                    : "Clique em 'Criar novo usuário' para adicionar o primeiro usuário ao sistema"
                  }
                </p>
              </div>
            ) : (
              /* Tabela de Usuários */
              <div className="space-y-4">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nome
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Usuário
                          </div>
                        </TableHead>
                        <TableHead className="text-center font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <span className="font-medium text-foreground">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`mailto:${user.email}`}
                              className="text-primary hover:text-primary/80 hover:underline transition-colors"
                            >
                              {user.email}
                            </a>
                          </TableCell>
                          <TableCell>
                            <code className="relative rounded-md bg-muted px-2 py-1 font-mono text-sm">
                              {user.username}
                            </code>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline"
                                  className={user.isActive === 1 
                                    ? "bg-success/10 text-success border-success/20 cursor-help" 
                                    : "bg-destructive/10 text-destructive border-destructive/20 cursor-help"
                                  }
                                >
                                  {user.isActive === 1 ? (
                                    <>
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Ativo
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-3 w-3 mr-1" />
                                      Inativo
                                    </>
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {user.isActive === 1 
                                    ? "Este usuário pode acessar o sistema" 
                                    : "Este usuário está desativado"
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8 hover:bg-muted"
                                    >
                                      <EllipsisVertical className="h-4 w-4" />
                                      <span className="sr-only">Abrir menu de ações</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ações do usuário</p>
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent className="w-56 bg-popover border border-border" align="end">
                                <DropdownMenuLabel className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Ações do usuário
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem 
                                    onClick={() => openEditModal(user)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4 text-primary" />
                                    Editar usuário
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    <DeletarUsuario 
                                      idUser={user.id} 
                                      listarUsuarios={listarUsuarios}
                                    />
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Controles de Paginação */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrando</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={handleItemsPerPageChange}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>de {filteredData.length} usuários</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages || 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                        <span className="sr-only">Primeira página</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Página anterior</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Próxima página</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                        <span className="sr-only">Última página</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        <EditUserModal
          user={selectedUser}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    </TooltipProvider>
  );
}