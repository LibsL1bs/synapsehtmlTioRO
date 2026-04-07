import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  BarChart3,
  BookOpen,
  Hexagon,
  UserCircle,
  Server,
  ScrollText,
  Terminal,
  Users,
  Database as DatabaseIcon,
  LogOut,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearStoredUser, getStoredUser, isAdminUser } from "@/lib/apiClient";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Database, label: "Dados", path: "/dados" },
  { icon: UserCircle, label: "Perfil", path: "/perfil" },
  { icon: BarChart3, label: "Métricas", path: "/metricas" },
  { icon: BookOpen, label: "Educacional", path: "/educacional" },
];

const adminItems = [
  { icon: Server, label: "Sistema", path: "/admin/sistema" },
  { icon: Users, label: "Usuários", path: "/admin/usuarios" },
  { icon: ScrollText, label: "Logs IA", path: "/admin/logs" },
  { icon: Terminal, label: "Testes", path: "/admin/testes" },
  { icon: DatabaseIcon, label: "Dados", path: "/admin/dados" },
];

export function AppSidebar() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = isAdminUser(getStoredUser());

  const renderNavItem = (item: typeof navItems[number]) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`relative flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-150 group cursor-pointer ${
          isActive
            ? "surface-3 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:surface-2"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-alert rounded-r-sm animate-slide-active" />
        )}
        <item.icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.5} />
        {expanded && (
          <span className="text-xs font-medium whitespace-nowrap animate-fade-in tracking-wide">
            {item.label}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className="h-screen flex flex-col border-r border-border surface-1 transition-all duration-200 ease-out z-50 shrink-0"
      style={{ width: expanded ? 180 : 52 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center border-b border-border">
        <Hexagon className="w-5 h-5 text-alert" strokeWidth={1.5} />
        {expanded && (
          <span className="ml-2 text-xs font-bold text-foreground tracking-[0.2em] uppercase animate-fade-in font-mono">
            SYNAPSE
          </span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 p-1.5 mt-1 overflow-y-auto">
        {navItems.map(renderNavItem)}

        {/* Admin divider */}
        {isAdmin ? (
          <>
            <div className="my-2 px-2">
              <div className="tech-divider" />
              {expanded && (
                <span className="text-[8px] font-mono text-muted-foreground/50 tracking-[0.25em] uppercase mt-1 block animate-fade-in">
                  ADMIN
                </span>
              )}
            </div>

            {adminItems.map(renderNavItem)}
          </>
        ) : null}
      </nav>

      {/* Bottom — Logout */}
      <div className="p-1.5 border-t border-border">
        <div className="flex items-center justify-center mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-subtle" />
          {expanded && (
            <span className="ml-2 text-[10px] text-muted-foreground animate-fade-in font-mono uppercase tracking-wider">Online</span>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-muted-foreground/60 hover:text-alert hover:surface-2 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-[17px] h-[17px] shrink-0" strokeWidth={1.5} />
              {expanded && (
                <span className="text-xs font-medium whitespace-nowrap animate-fade-in tracking-wide">
                  Sair
                </span>
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="surface-2 border-border max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-mono tracking-wider uppercase">Encerrar Sessão</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground font-mono">
                Deseja encerrar sua sessão no Synapse? Você precisará autenticar novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-[10px] font-mono tracking-wider border-border">CANCELAR</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearStoredUser();
                  navigate("/login");
                }}
                className="text-[10px] font-mono tracking-wider bg-alert text-alert-foreground hover:bg-alert/90"
              >
                SAIR
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}
