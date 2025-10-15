import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueue } from '@/contexts/queue-hooks';
import { Bell, BellRing, CheckCircle, Users, Clock, XCircle, History } from 'lucide-react';
import { toast } from 'sonner';
// Áudio e voz passam a ser centralizados no painel de exibição
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';

const Attendant = () => {
  const { tickets, currentTicket, callNextTicket, recallTicket, completeTicket, cancelTicket, getWaitingTickets, services, getServiceHistory, displayMessage, updateDisplayMessage } = useQueue();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const { user } = useAuth();

  const handleCallNext = () => {
    if (selectedService === null) return;
    const waitingTickets = getWaitingTickets(selectedService ?? undefined);
    if (waitingTickets.length > 0) {
      const nextTicket = waitingTickets[0];
      const service = services.find(s => s.id === nextTicket.service);
      
      callNextTicket(selectedService ?? undefined);
      toast.success('Próxima senha chamada!');
      
      // Áudio/voz apenas no painel de exibição
    }
  };

  const handleComplete = () => {
    if (currentTicket) {
      completeTicket(currentTicket.id, notes || undefined);
      toast.success('Atendimento concluído!');
      setNotes('');
    }
  };

  const handleRecall = () => {
    if (currentTicket) {
      recallTicket(currentTicket.id);
      // Áudio/voz apenas no painel de exibição
      toast.success('Chamando novamente a mesma senha!');
    }
  };

  const handleCancel = () => {
    if (currentTicket) {
      cancelTicket(currentTicket.id, notes || undefined);
      toast.success('Senha cancelada. Disponível para reuso conforme cadastro.');
      setNotes('');
    }
  };

  const waitingTickets = getWaitingTickets(selectedService ?? undefined);
  const totalWaiting = tickets.filter(t => t.status === 'waiting').length;
  const totalCompleted = tickets.filter(t => t.status === 'completed').length;
  const myCompleted = user ? tickets.filter(t => t.status === 'completed' && t.attendantId === user.id).length : 0;

  return (
    <AppLayout>
      <PageHeader
        backTo="/"
        title="Painel do Atendente"
        description="Gerenciar atendimentos"
        breadcrumbItems={[{ label: 'Início', to: '/' }, { label: 'Atendente' }]}
        actions={(
          <div className="flex flex-wrap gap-4">
            <Card className="px-6 py-4 min-w-[180px] flex-1">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalWaiting}</p>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </Card>
            <Card className="px-6 py-4 min-w-[180px] flex-1">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{totalCompleted}</p>
                  <p className="text-sm text-muted-foreground">Atendidos (total)</p>
                </div>
              </div>
            </Card>
            <Card className="px-6 py-4 min-w-[180px] flex-1">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{myCompleted}</p>
                  <p className="text-sm text-muted-foreground">Meus atendimentos</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      />

        {/* Mensagem do Painel (admin e serviço podem definir aqui) */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Mensagem do Painel</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Ex.: Atenção: atendimento preferencial em andamento"
              value={displayMessage}
              onChange={(e) => updateDisplayMessage(e.target.value)}
            />
            <Button variant="secondary" onClick={() => updateDisplayMessage(displayMessage.trim())}>Aplicar</Button>
            <Button variant="outline" onClick={() => updateDisplayMessage('')}>Limpar</Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 md:p-8">
              <h2 className="text-2xl font-semibold mb-6">Filtrar por Serviço</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => setSelectedService(null)}
                  variant={selectedService === null ? 'default' : 'outline'}
                  className="h-auto py-6"
                >
                  <div className="text-left w-full">
                    <p className="font-semibold text-lg">Todos</p>
                    <p className="text-sm opacity-80">
                      {tickets.filter(t => t.status === 'waiting').length} aguardando
                    </p>
                  </div>
                </Button>
                {services.map((service) => {
                  const count = tickets.filter(
                    t => t.service === service.id && t.status === 'waiting'
                  ).length;
                  return (
                    <Button
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      variant={selectedService === service.id ? 'default' : 'outline'}
                      className="h-auto py-6"
                    >
                      <div className="text-left w-full">
                        <p className="font-semibold text-lg">{service.name}</p>
                        <p className="text-sm opacity-80">{count} aguardando</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Fila de Espera
              </h2>
              {waitingTickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Nenhuma senha aguardando</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waitingTickets.map((ticket, index) => {
                    const service = services.find(s => s.id === ticket.service);
                    return (
                      <div
                        key={ticket.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          index === 0 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-primary' : 'text-foreground'
                          }`}>
                            {ticket.number}
                          </div>
                          <div>
                            <p className="font-medium">{service?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.timestamp.toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {ticket.type === 'priority' && (
                          <Badge variant="destructive">Prioritário</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-8 sticky top-4">
              <h2 className="text-2xl font-semibold mb-6">Atendimento Atual</h2>
              
              {currentTicket ? (
                <div className="space-y-6">
                  <div className="text-center p-8 bg-gradient-primary rounded-lg">
                    <p className="text-primary-foreground/80 mb-2">Senha</p>
                    <p className="text-6xl font-bold text-primary-foreground">
                      {currentTicket.number}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-medium">
                        {services.find(s => s.id === currentTicket.service)?.name}
                      </span>
                    </div>
                    {currentTicket.clientData?.name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{currentTicket.clientData.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant={currentTicket.type === 'priority' ? 'destructive' : 'secondary'}>
                        {currentTicket.type === 'priority' ? 'Prioritário' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Chamado às:</span>
                      <span className="font-medium">
                        {currentTicket.calledAt?.toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm mb-1">Observações (opcional)</label>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Remarcado, faltou documento, etc." />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      onClick={handleRecall}
                      className="w-full"
                      size="lg"
                      variant="secondary"
                    >
                      <BellRing className="w-5 h-5 mr-2" />
                      Repetir chamada
                    </Button>
                    <Button 
                      onClick={handleComplete}
                      className="w-full"
                      size="lg"
                      variant="default"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Concluir Atendimento
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      className="w-full"
                      size="lg"
                      variant="destructive"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Cancelar senha
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Nenhum atendimento em andamento
                  </p>
                </div>
              )}

              <div className="pt-6 border-t">
                <Button 
                  onClick={handleCallNext}
                  disabled={waitingTickets.length === 0 || selectedService === null}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Chamar próxima senha
                </Button>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                Histórico do Serviço
              </h2>
              {selectedService ? (
                <div className="space-y-3">
                  {getServiceHistory(selectedService).slice(0, 10).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold">{t.number}</div>
                        <div>
                          <p className="font-medium">{services.find(s => s.id === t.service)?.name}</p>
                          <p className="text-sm text-muted-foreground">{t.calledAt?.toLocaleTimeString('pt-BR') || t.completedAt?.toLocaleTimeString('pt-BR') || t.canceledAt?.toLocaleTimeString('pt-BR')}</p>
                        </div>
                      </div>
                      <Badge variant={t.status === 'canceled' ? 'destructive' : t.status === 'completed' ? 'secondary' : 'outline'}>
                        {t.status === 'canceled' ? 'Cancelado' : t.status === 'completed' ? 'Atendido' : 'Chamado'}
                      </Badge>
                    </div>
                  ))}
                  {getServiceHistory(selectedService).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">Sem histórico recente para este serviço.</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">Selecione um serviço para visualizar o histórico.</div>
              )}
            </Card>
          </div>
        </div>
    </AppLayout>
  );
};

export default Attendant;
