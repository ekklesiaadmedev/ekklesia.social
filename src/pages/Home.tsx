import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ticket, Monitor, UserCircle, Settings, BarChart3, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Home = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-end mb-4">
            {user ? (
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            ) : (
              <Button onClick={() => navigate('/login')} variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Login Admin
              </Button>
            )}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Ekklesia Social
          </h1>
          <p className="text-xl text-muted-foreground">
            Gestão moderna de atendimento para ação social
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          <Card 
            className="p-8 hover:shadow-elegant transition-all cursor-pointer group"
            onClick={() => navigate('/gerar-senha')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <Ticket className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Gerar Senha</h2>
              <p className="text-muted-foreground">
                Retire sua senha de atendimento
              </p>
            </div>
          </Card>

          <Card 
            className="p-8 hover:shadow-elegant transition-all cursor-pointer group"
            onClick={() => navigate('/painel')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-secondary/10 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <Monitor className="w-10 h-10 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold">Painel</h2>
              <p className="text-muted-foreground">
                Visualizar chamadas
              </p>
            </div>
          </Card>

          <Card 
            className="p-8 hover:shadow-elegant transition-all cursor-pointer group"
            onClick={() => navigate('/atendente')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCircle className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Atendente</h2>
              <p className="text-muted-foreground">
                Gerenciar atendimentos
              </p>
            </div>
          </Card>

          <Card 
            className="p-8 hover:shadow-elegant transition-all cursor-pointer group"
            onClick={() => navigate('/especialidades')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-accent/10 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Especialidades</h2>
              <p className="text-muted-foreground">
                Gerenciar tipos de atendimento
              </p>
            </div>
          </Card>

          <Card 
            className="p-8 hover:shadow-elegant transition-all cursor-pointer group"
            onClick={() => navigate('/relatorios')}
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-success/10 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-bold">Relatórios</h2>
              <p className="text-muted-foreground">
                Estatísticas e exportação
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground animate-fade-in">
          <p>Sistema de Gestão de Filas - Ekklesia Social</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
