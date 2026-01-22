import { useContext } from "react";
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  User, 
  LogOut,
  Moon,
  Sun,
  Monitor,
  Settings,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "@/contexts/Auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "../ui/button";
import logo from '../../../public/logo.jpeg';
import logoOletv from '@/assets/logo-oletv.png';

export default function Sidebar() {
  const { logout }: any = useContext(AuthContext);
  const location = useLocation();
  const { theme, setTheme, isDark } = useTheme();

  const authData: any = localStorage.getItem("auth_user");
  const userData: any = authData ? JSON.parse(authData) : null;

  const isAdmin = userData ? Number(userData.isAdmin) : 0;

  const navigationItems = [
    { 
      icon: LayoutDashboard, 
      name: "Dashboard", 
      link: "/",
      description: "Visão geral do sistema"
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
  ];

  const bottomItems = [
    { 
      icon: User, 
      name: "Minha Conta", 
      link: "/conta",
      description: "Perfil e configurações"
    },
    { 
      icon: Settings, 
      name: "Configurações", 
      link: "/configuracoes",
      description: "Preferências do sistema"
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const ThemeIcon = isDark ? Moon : Sun;

  return (
    <aside className="w-[260px] h-screen bg-slate-900 flex flex-col fixed left-0 top-0 z-50">
      {/* Logo Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10">
            <img src={logo} alt="SysProv" className="w-full h-full object-cover" />
          </div>
          <span className="text-slate-500 text-sm">+</span>
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/90 flex items-center justify-center p-1">
            <img src={logoOletv} alt="Olé TV" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="mt-3">
          <h1 className="text-sm font-semibold text-white">Sistema de Integração</h1>
          <p className="text-xs text-slate-500">ERP + Olé TV</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="mb-2">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Menu Principal
          </span>
        </div>
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.link);
            
            return (
              <Link 
                to={item.link} 
                key={item.name}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-white text-slate-900' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-white'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                </div>
                {active && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-800">
        <div className="mb-2">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Configurações
          </span>
        </div>
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.link);
            
            return (
              <Link 
                to={item.link} 
                key={item.name}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-white text-slate-900' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Theme Toggle */}
        <div className="mt-3 px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThemeIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Tema</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  onClick={() => setTheme("light")}
                  className={`gap-2 cursor-pointer text-slate-300 hover:text-white ${theme === 'light' ? 'bg-slate-700' : ''}`}
                >
                  <Sun className="h-4 w-4" />
                  Claro
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme("dark")}
                  className={`gap-2 cursor-pointer text-slate-300 hover:text-white ${theme === 'dark' ? 'bg-slate-700' : ''}`}
                >
                  <Moon className="h-4 w-4" />
                  Escuro
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme("system")}
                  className={`gap-2 cursor-pointer text-slate-300 hover:text-white ${theme === 'system' ? 'bg-slate-700' : ''}`}
                >
                  <Monitor className="h-4 w-4" />
                  Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}
