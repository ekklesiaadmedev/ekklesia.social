import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQueue } from '@/contexts/QueueContext';
import { ArrowLeft } from 'lucide-react';
import { speakTicket } from '@/utils/textToSpeech';

const DisplayPanel = () => {
  const navigate = useNavigate();
  const { currentTicket, tickets, services } = useQueue();
  const [isNewCall, setIsNewCall] = useState(false);

  useEffect(() => {
    if (currentTicket) {
      setIsNewCall(true);
      const timer = setTimeout(() => setIsNewCall(false), 3000);
      
      // Anunciar com voz
      const service = services.find(s => s.id === currentTicket.service);
      if (service) {
        speakTicket(currentTicket.number, service.name, currentTicket.clientData?.name);
      }
      
      return () => clearTimeout(timer);
    }
  }, [currentTicket, services]);

  const recentTickets = tickets
    .filter(t => t.status === 'called' || t.status === 'completed')
    .sort((a, b) => {
      const timeA = a.calledAt?.getTime() || 0;
      const timeB = b.calledAt?.getTime() || 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-secondary p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            size="icon"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white text-right">
            <p className="text-sm opacity-80">Painel de Chamadas</p>
            <p className="text-lg font-semibold">
              {new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <Card className={`p-16 text-center shadow-strong ${isNewCall ? 'animate-pulse-glow' : ''}`}>
            {currentTicket ? (
              <div className="animate-fade-in">
                <p className="text-2xl text-muted-foreground mb-6">Senha Chamada</p>
                <div className="text-[180px] font-bold leading-none mb-6 bg-gradient-primary bg-clip-text text-transparent">
                  {currentTicket.number}
                </div>
                <p className="text-3xl text-muted-foreground">
                  Compareça ao guichê de atendimento
                </p>
              </div>
            ) : (
              <div>
                <p className="text-4xl text-muted-foreground mb-4">Aguardando Chamada</p>
                <div className="text-8xl opacity-20 mb-4">---</div>
                <p className="text-xl text-muted-foreground">
                  Retire sua senha no totem
                </p>
              </div>
            )}
          </Card>
        </div>

        {recentTickets.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-1 h-8 bg-white rounded-full"></div>
              Últimas Chamadas
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {recentTickets.map((ticket, index) => (
                <Card 
                  key={ticket.id}
                  className={`p-6 text-center transition-all duration-300 ${
                    index === 0 && ticket.status === 'called' 
                      ? 'bg-gradient-secondary text-secondary-foreground scale-105' 
                      : 'bg-white/10 backdrop-blur-sm text-white border-white/20'
                  }`}
                >
                  <p className="text-sm opacity-80 mb-2">
                    {ticket.calledAt?.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="text-4xl font-bold">{ticket.number}</p>
                  {ticket.status === 'completed' && (
                    <p className="text-xs mt-2 opacity-60">Concluído</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayPanel;
