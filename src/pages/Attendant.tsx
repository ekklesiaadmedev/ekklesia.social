import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueue } from '@/contexts/QueueContext';
import { ArrowLeft, Bell, CheckCircle, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { speakTicket } from '@/utils/textToSpeech';

const Attendant = () => {
  const navigate = useNavigate();
  const { tickets, currentTicket, callNextTicket, completeTicket, getWaitingTickets, services } = useQueue();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleCallNext = () => {
    const waitingTickets = getWaitingTickets(selectedService as any);
    if (waitingTickets.length > 0) {
      const nextTicket = waitingTickets[0];
      const service = services.find(s => s.id === nextTicket.service);
      
      callNextTicket(selectedService as any);
      toast.success('Próxima senha chamada!');
      
      // Anunciar com voz
      if (service) {
        speakTicket(nextTicket.number, service.name, nextTicket.clientData?.name);
      }
    }
  };

  const handleComplete = () => {
    if (currentTicket) {
      completeTicket(currentTicket.id);
      toast.success('Atendimento concluído!');
    }
  };

  const waitingTickets = getWaitingTickets(selectedService as any);
  const totalWaiting = tickets.filter(t => t.status === 'waiting').length;
  const totalCompleted = tickets.filter(t => t.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Painel do Atendente</h1>
              <p className="text-muted-foreground">Gerenciar atendimentos</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Card className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalWaiting}</p>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </Card>
            <Card className="px-6 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{totalCompleted}</p>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-semibold mb-6">Filtrar por Serviço</h2>
              <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <Button 
                    onClick={handleComplete}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Concluir Atendimento
                  </Button>
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
                  disabled={waitingTickets.length === 0}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Chamar Próximo
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendant;
