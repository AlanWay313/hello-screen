import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  UserCog,
  FileText,
  Settings,
  DollarSign,
  X,
  ArrowRight
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

const navigationItems: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral e estatísticas",
    path: "/",
    icon: <LayoutDashboard className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Gerenciar clientes cadastrados",
    path: "/clientes",
    icon: <Users className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "usuarios",
    title: "Usuários",
    description: "Gerenciar usuários do sistema",
    path: "/usuarios",
    icon: <UserCog className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "logs",
    title: "Logs",
    description: "Histórico de atividades",
    path: "/logs",
    icon: <FileText className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Gestão financeira",
    path: "/financeiro",
    icon: <DollarSign className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Configurações do sistema",
    path: "/configuracoes",
    icon: <Settings className="w-4 h-4" />,
    category: "Páginas"
  },
  {
    id: "conta",
    title: "Minha Conta",
    description: "Editar perfil e preferências",
    path: "/conta",
    icon: <Users className="w-4 h-4" />,
    category: "Páginas"
  },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim()) {
      const filtered = navigationItems.filter(
        item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K para focar na busca
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        handleSelect(results[selectedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative max-w-md w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Buscar páginas... (Ctrl+K)"
          className="w-full h-10 pl-10 pr-10 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              Resultados ({results.length})
            </p>
            <div className="space-y-0.5">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    index === selectedIndex
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    index === selectedIndex ? "bg-primary/20" : "bg-muted"
                  }`}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.description}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border px-3 py-2 bg-muted/50">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              {" "}para navegar{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
              {" "}para selecionar{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
              {" "}para fechar
            </p>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-50 p-4 text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Nenhum resultado para "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
