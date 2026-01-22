import { useContext } from "react";
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  User, 
  LogOut,
  ChevronDown,
  Sparkles,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "@/contexts/Auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "../ui/button";

export default function Sidebar() {
  const { logout }: any = useContext(AuthContext);
  const location = useLocation();
  const { theme, setTheme, isDark } = useTheme();

  const authData: any = localStorage.getItem("auth_user");
  const userData: any = authData ? JSON.parse(authData) : null;

  const documento = userData?.documento || userData?.email;
  const name = userData?.name || "Usuário";
  const email = userData?.email || documento;
  const isAdmin = userData ? Number(userData.isAdmin) : 0;

  const navigationItems = [
    { 
      icon: LayoutDashboard, 
      name: "Dashboard", 
      link: "/",
      description: "Visão geral"
    },
    { 
      icon: Users, 
      name: "Clientes", 
      link: "/clientes",
      description: "Gerenciar clientes"
    },
    { 
      icon: ClipboardList, 
      name: "Logs", 
      link: "/logs",
      description: "Histórico de ações"
    },
    ...(isAdmin ? [{ 
      icon: Users, 
      name: "Usuários", 
      link: "/usuarios",
      description: "Gerenciar usuários"
    }] : []),
    { 
      icon: User, 
      name: "Minha Conta", 
      link: "/conta",
      description: "Perfil e configurações"
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const ThemeIcon = isDark ? Moon : Sun;

  return (
    <aside className="w-[280px] h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Frionline</h1>
            <p className="text-xs text-muted-foreground">Sysprov Integração</p>
          </div>
          
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-lg hover:bg-secondary"
              >
                <ThemeIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover border border-border z-50">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setTheme("light")}
                className={`gap-2 cursor-pointer ${theme === 'light' ? 'bg-secondary' : ''}`}
              >
                <Sun className="h-4 w-4" />
                Claro
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme("dark")}
                className={`gap-2 cursor-pointer ${theme === 'dark' ? 'bg-secondary' : ''}`}
              >
                <Moon className="h-4 w-4" />
                Escuro
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setTheme("system")}
                className={`gap-2 cursor-pointer ${theme === 'system' ? 'bg-secondary' : ''}`}
              >
                <Monitor className="h-4 w-4" />
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.link);
            
            return (
              <Link 
                to={item.link} 
                key={item.name}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
              >
                <div className={`
                  p-1.5 rounded-lg transition-colors duration-200
                  ${active 
                    ? 'bg-primary/10' 
                    : 'bg-transparent group-hover:bg-secondary'
                  }
                `}>
                  <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${active ? 'text-primary' : ''}`}>
                    {item.name}
                  </span>
                </div>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold text-primary-foreground">
                  {getInitials(name)}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-popover border border-border shadow-elevated z-50"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem asChild>
              <Link to="/conta" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                <span>Minha Conta</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
