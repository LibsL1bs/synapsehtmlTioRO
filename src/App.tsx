import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Registro from "@/pages/Registro";
import Dashboard from "@/pages/Dashboard";
import Perfil from "@/pages/Perfil";
import PerfilConta from "@/pages/PerfilConta";
import Metricas from "@/pages/Metricas";
import Educacional from "@/pages/Educacional";
import AdminSistema from "@/pages/AdminSistema";
import AdminUsuarios from "@/pages/AdminUsuarios";
import AdminLogs from "@/pages/AdminLogs";
import AdminTestes from "@/pages/AdminTestes";
import AdminDados from "@/pages/AdminDados";
import NotFound from "./pages/NotFound";
import { getStoredUser, isAdminUser } from "@/lib/apiClient";

const queryClient = new QueryClient();

function AppLayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const user = getStoredUser();
  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public pages */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* App pages with sidebar + chat */}
          <Route element={<AppLayoutWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dados" element={<Perfil />} />
            <Route path="/perfil" element={<PerfilConta />} />
            <Route path="/metricas" element={<Metricas />} />
            <Route path="/educacional" element={<Educacional />} />
            <Route path="/admin/sistema" element={<AdminRoute><AdminSistema /></AdminRoute>} />
            <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuarios /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
            <Route path="/admin/testes" element={<AdminRoute><AdminTestes /></AdminRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
