import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-xl w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <span className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">404</span>
          </div>
          <h2 className="text-2xl font-semibold">Página não encontrada</h2>
          <p className="text-muted-foreground">
            O recurso solicitado não existe ou foi movido.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <a href="/">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Home
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NotFound;
