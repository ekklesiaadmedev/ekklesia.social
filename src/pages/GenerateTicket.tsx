import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueue } from '@/contexts/QueueContext';
import { ServiceType, TicketType, ClientData } from '@/types/queue';
import { ArrowLeft, Ticket as TicketIcon, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';

const GenerateTicket = () => {
  const navigate = useNavigate();
  const { generateTicket, services } = useQueue();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [generatedTicket, setGeneratedTicket] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
  });

  const handleContinue = () => {
    if (!selectedService || !selectedType) {
      toast.error('Selecione o serviço e o tipo de atendimento');
      return;
    }
    setShowClientForm(true);
  };

  const handleGenerate = () => {
    if (!clientData.name) {
      toast.error('Por favor, informe o nome');
      return;
    }

    const ticket = generateTicket(
      selectedService!, 
      selectedType!, 
      clientData
    );
    setGeneratedTicket(ticket.number);
    toast.success('Senha gerada com sucesso!');
  };

  const handleSkipForm = () => {
    const ticket = generateTicket(selectedService!, selectedType!);
    setGeneratedTicket(ticket.number);
    toast.success('Senha gerada com sucesso!');
  };

  const handleNewTicket = () => {
    setSelectedService(null);
    setSelectedType(null);
    setGeneratedTicket(null);
    setShowClientForm(false);
    setClientData({ name: '', cpf: '', phone: '', email: '' });
  };

  if (generatedTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-12 text-center animate-slide-up shadow-strong">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto flex items-center justify-center animate-pulse-glow mb-6">
              <span className="text-5xl font-bold text-primary-foreground">{generatedTicket}</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Senha Gerada!</h2>
            <p className="text-muted-foreground text-lg mb-2">
              Aguarde ser chamado no painel
            </p>
            <p className="text-sm text-muted-foreground">
              Guarde esta senha para o atendimento
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleNewTicket}
              className="w-full"
              size="lg"
            >
              Gerar Nova Senha
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
              size="lg"
            >
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Gerar Senha</h1>
            <p className="text-muted-foreground">Selecione o serviço e preencha os dados</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Escolha o Serviço</h2>
            <div className="grid grid-cols-2 gap-4">
              {services.map((service) => (
                <Button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  variant={selectedService === service.id ? 'default' : 'outline'}
                  className="h-auto py-6"
                >
                  <div className="text-left w-full">
                    <p className="font-semibold text-lg">{service.name}</p>
                    <p className="text-sm opacity-80">Prefixo: {service.prefix}</p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Tipo de Atendimento</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setSelectedType('normal')}
                variant={selectedType === 'normal' ? 'default' : 'outline'}
                className="h-auto py-8"
              >
                <div className="text-center w-full">
                  <p className="font-semibold text-xl mb-2">Normal</p>
                  <p className="text-sm opacity-80">Atendimento padrão</p>
                </div>
              </Button>
              <Button
                onClick={() => setSelectedType('priority')}
                variant={selectedType === 'priority' ? 'destructive' : 'outline'}
                className="h-auto py-8"
              >
                <div className="text-center w-full">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold text-xl mb-2">Prioritário</p>
                  <p className="text-sm opacity-80">Atendimento preferencial</p>
                </div>
              </Button>
            </div>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Atendimento Prioritário:</strong> idosos (60+), gestantes, 
                lactantes, pessoas com deficiência e pessoas com crianças de colo.
              </p>
            </div>
          </Card>

          <div>
            {!showClientForm ? (
              <Button 
                onClick={handleContinue}
                disabled={!selectedService || !selectedType}
                size="lg"
                className="w-full text-lg py-8"
              >
                <User className="w-6 h-6 mr-2" />
                Continuar
              </Button>
            ) : (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Dados do Atendido</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={clientData.cpf}
                      onChange={(e) => setClientData({ ...clientData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={clientData.phone}
                      onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientData.email}
                      onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSkipForm}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Pular
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    size="lg"
                    className="flex-1"
                  >
                    <TicketIcon className="w-5 h-5 mr-2" />
                    Gerar
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateTicket;
