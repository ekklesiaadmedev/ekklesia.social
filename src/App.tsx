import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueueProvider } from "@/contexts/QueueContext";
import Home from "./pages/Home";
import GenerateTicket from "./pages/GenerateTicket";
import DisplayPanel from "./pages/DisplayPanel";
import Attendant from "./pages/Attendant";
import ServiceManagement from "./pages/ServiceManagement";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <QueueProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gerar-senha" element={<GenerateTicket />} />
            <Route path="/painel" element={<DisplayPanel />} />
            <Route path="/atendente" element={<Attendant />} />
            <Route path="/especialidades" element={<ServiceManagement />} />
            <Route path="/relatorios" element={<Reports />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueueProvider>
  </QueryClientProvider>
);

export default App;
