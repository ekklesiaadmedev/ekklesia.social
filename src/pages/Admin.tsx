import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQueue } from '@/contexts/queue-hooks';
import { toast } from 'sonner';
import { Settings, BarChart3, Users as UsersIcon, FileClock, Bug } from 'lucide-react';
import UserManagement from './UserManagement';
import AuditLogs from './AuditLogs';
import PageHeader from '@/components/layout/PageHeader';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DebugAuth } from '@/components/DebugAuth';

const Admin = () => {
  console.log('🏛️ [ADMIN] Componente Admin carregado!');
  
  const navigate = useNavigate();
  const { updateDisplayMessage } = useQueue();
  const [message, setMessage] = useState('');
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Administração"
          description="Gerenciar serviços, usuários e relatórios"
          backTo="/"
          breadcrumbItems={[{ label: 'Início', to: '/' }, { label: 'Administração' }]}
        />

        {/* Mensagem do painel */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Mensagem do Painel</h2>
          <div className="flex gap-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem para exibir no painel"
            />
            <Button
              onClick={() => {
                updateDisplayMessage(message.trim());
                toast.success('Mensagem do painel atualizada');
              }}
            >
              Atualizar
            </Button>
          </div>
        </Card>

        {/* Ações rápidas (links para páginas existentes, sem duplicar conteúdo) */}
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate('/servicos')} className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Gerenciar Serviços
            </Button>
            <Button variant="secondary" onClick={() => navigate('/relatorios')} className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Relatórios
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Usuários</TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2"><FileClock className="w-4 h-4" /> Logs</TabsTrigger>
              <TabsTrigger value="debug" className="flex items-center gap-2"><Bug className="w-4 h-4" /> Debug Auth</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
            <TabsContent value="logs">
              <AuditLogs />
            </TabsContent>
            <TabsContent value="debug">
              <DebugAuth />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Admin;