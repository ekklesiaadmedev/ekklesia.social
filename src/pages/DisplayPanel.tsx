import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQueue } from '@/contexts/queue-hooks';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { speakTicket } from '@/utils/textToSpeech';
import logo from '../../anexos/logo_min_ekklesia.png';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';

const DisplayPanel = () => {
  const navigate = useNavigate();
  const { currentTicket, tickets, services, displayMessage, loading } = useQueue();
  const [isNewCall, setIsNewCall] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    .filter(t => t.status === 'called' || t.status === 'completed' || t.status === 'canceled')
    .sort((a, b) => {
      const timeA = a.calledAt?.getTime() || 0;
      const timeB = b.calledAt?.getTime() || 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Erro ao alternar tela cheia', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-secondary p-4 md:p-6">
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
          <div className="flex items-center gap-3">
            <Button onClick={toggleFullscreen} variant="outline" size="icon" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
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
        </div>

        {/* Área institucional (logotipo e informações) */}
        <div className="mb-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo da Igreja" className="w-12 h-12 rounded bg-white object-contain p-1" />
            <div>
              <p className="text-sm opacity-80">Ekklesia Social</p>
              <p className="text-xs opacity-60">Serviço comunitário</p>
            </div>
          </div>
          <div className="text-sm opacity-80">Seja bem-vindo(a)</div>
        </div>

        {/* Mensagem configurável do painel */}
        {displayMessage && (
          <Card className="p-4 text-center bg-white/10 backdrop-blur-sm text-white border-white/20 mb-6">
            <p className="text-lg font-medium">{displayMessage}</p>
          </Card>
        )}

        <div className="mb-8">
          <Card className={`p-8 md:p-16 text-center shadow-strong ${isNewCall ? 'animate-pulse-glow' : ''}`}> 
            {loading ? (
              <div className="space-y-6">
                <SkeletonLoader type="card" />
              </div>
            ) : currentTicket ? (
              <div className="animate-fade-in">
                <p className="text-xl md:text-2xl text-muted-foreground mb-4 md:mb-6">Senha Chamada</p>
                <div className="font-bold leading-none mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent text-6xl md:text-8xl xl:text-[160px]">
                  {currentTicket.number}
                </div>
                <div className="space-y-2">
                  <p className="text-lg md:text-2xl lg:text-3xl text-muted-foreground truncate">
                    Dirija-se ao serviço {services.find(s => s.id === currentTicket.service)?.name}
                  </p>
                  <p className="text-base md:text-xl text-muted-foreground">
                    Atendido: {currentTicket.clientData?.name || '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-4xl text-muted-foreground mb-4">Aguardando Chamada</p>
                <div className="text-8xl opacity-20 mb-4">---</div>
              </div>
            )}
          </Card>
        </div>

        {loading ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-1 h-8 bg-white rounded-full"></div>
              Últimas Chamadas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <SkeletonLoader type="card" count={5} />
            </div>
          </div>
        ) : recentTickets.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-1 h-8 bg-white rounded-full"></div>
              Últimas Chamadas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
                  {ticket.status === 'canceled' && (
                    <p className="text-xs mt-2 opacity-60">Cancelado</p>
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
