import { useNavigate } from 'react-router-dom';
import { Ticket, Monitor, UserCircle, Settings, BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ActionTile } from '@/components/ActionTile';
import { Card } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { FullPageSpinner } from '@/components/ui/spinner';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isTriage, isService, profileLoaded, loading } = useAuth();
  const disabledGlobal = !user;

  if (loading || !profileLoaded) {
    return <FullPageSpinner text="Carregando painel..." />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Ekklesia Social</h1>
          <p className="mt-2 text-sm text-muted-foreground">Escolha uma ação abaixo para começar.</p>
        </div>

        

        <div className="max-w-7xl mx-auto">
          <Card className="p-6 md:p-8 mb-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {(isAdmin || isTriage) && (
            <ActionTile
              title="Gerar Senha"
              description="Retire sua senha de atendimento"
              Icon={Ticket}
              color="primary"
              disabled={disabledGlobal}
              disabledMsg={disabledGlobal ? 'Faça login para acessar' : undefined}
              onClick={() => navigate('/gerar-senha')}
            />
          )}

          <ActionTile
            title="Painel"
            description="Visualizar chamadas"
            Icon={Monitor}
            color="secondary"
            disabled={disabledGlobal}
            disabledMsg={disabledGlobal ? 'Faça login para acessar' : undefined}
            onClick={() => navigate('/painel')}
          />

          {(isAdmin || isService) && (
            <ActionTile
              title="Atendente"
              description="Gerenciar atendimentos"
              Icon={UserCircle}
              color="accent"
              disabled={disabledGlobal}
              disabledMsg={disabledGlobal ? 'Faça login para acessar' : undefined}
              onClick={() => navigate('/atendente')}
            />
          )}

          {isAdmin && (
            <ActionTile
              title="Serviços"
              description="Gerenciar tipos de atendimento"
              Icon={Settings}
              color="accent"
              disabled={disabledGlobal}
              disabledMsg={disabledGlobal ? 'Faça login para acessar' : undefined}
              onClick={() => navigate('/servicos')}
            />
          )}

          {isAdmin && (
            <ActionTile
              title="Relatórios"
              description="Estatísticas e exportação"
              Icon={BarChart3}
              color="success"
              disabled={disabledGlobal}
              disabledMsg={disabledGlobal ? 'Faça login para acessar' : undefined}
              onClick={() => navigate('/relatorios')}
            />
          )}
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground animate-fade-in">
          <p>Sistema de Gestão de Filas - Ekklesia Social</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
