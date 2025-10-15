import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueueProvider } from "@/contexts/QueueContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import GenerateTicket from "./pages/GenerateTicket";
import DisplayPanel from "./pages/DisplayPanel";
import Attendant from "./pages/Attendant";
import ServiceManagement from "./pages/ServiceManagement";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { Navbar } from "@/components/Navbar";
import { AdminRoute } from "@/components/AdminRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { DebugAuth } from "@/components/DebugAuth";

const queryClient = new QueryClient();

const HeaderWrapper = () => {
  const location = useLocation();
  if (location.pathname === "/login" || location.pathname === "/reset-password") return null;
  return <Navbar />;
};

const AppContent = () => (
  <>
    <HeaderWrapper />
    <Routes>
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/login" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/gerar-senha"
        element={<RoleRoute roles={["admin","triage"]}><GenerateTicket /></RoleRoute>}
      />
      <Route
        path="/painel"
        element={<RoleRoute roles={["panel","admin","service","triage"]}><DisplayPanel /></RoleRoute>}
      />
      <Route
        path="/atendente"
        element={<RoleRoute roles={["admin","service"]}><Attendant /></RoleRoute>}
      />
      <Route
        path="/servicos"
        element={<RoleRoute roles={["admin"]}><ServiceManagement /></RoleRoute>}
      />
      <Route
        path="/relatorios"
        element={<RoleRoute roles={["admin"]}><Reports /></RoleRoute>}
      />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/debug-auth" element={<AdminRoute><DebugAuth /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <QueueProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </QueueProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
