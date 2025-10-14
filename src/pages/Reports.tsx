import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQueue } from '@/contexts/QueueContext';
import { ArrowLeft, Download, BarChart3, Calendar, Users, Clock } from 'lucide-react';
import { useState } from 'react';

const Reports = () => {
  const navigate = useNavigate();
  const { tickets, services } = useQueue();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const todayTickets = tickets.filter(t => {
    const ticketDate = new Date(t.timestamp).toISOString().split('T')[0];
    return ticketDate === selectedDate;
  });

  const totalTickets = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === 'completed').length;
  const totalWaiting = tickets.filter(t => t.status === 'waiting').length;
  const totalCalled = tickets.filter(t => t.status === 'called').length;

  const todayCompleted = todayTickets.filter(t => t.status === 'completed').length;
  const todayTotal = todayTickets.length;

  const serviceStats = services.map(service => {
    const serviceTickets = tickets.filter(t => t.service === service.id);
    const completed = serviceTickets.filter(t => t.status === 'completed').length;
    const avgWaitTime = serviceTickets
      .filter(t => t.calledAt && t.timestamp)
      .reduce((acc, t) => {
        const wait = t.calledAt!.getTime() - t.timestamp.getTime();
        return acc + wait;
      }, 0) / (serviceTickets.filter(t => t.calledAt).length || 1);

    return {
      name: service.name,
      prefix: service.prefix,
      total: serviceTickets.length,
      completed,
      pending: serviceTickets.length - completed,
      avgWaitMinutes: Math.round(avgWaitTime / 60000),
    };
  });

  const exportToCSV = () => {
    const headers = ['Senha', 'Tipo', 'Especialidade', 'Status', 'Data/Hora', 'Cliente', 'Tempo de Espera'];
    const rows = tickets.map(t => {
      const service = services.find(s => s.id === t.service);
      const waitTime = t.calledAt 
        ? Math.round((t.calledAt.getTime() - t.timestamp.getTime()) / 60000) 
        : '-';
      return [
        t.number,
        t.type === 'priority' ? 'Prioritário' : 'Normal',
        service?.name || '-',
        t.status === 'completed' ? 'Concluído' : t.status === 'called' ? 'Chamado' : 'Aguardando',
        new Date(t.timestamp).toLocaleString('pt-BR'),
        t.clientData?.name || '-',
        `${waitTime} min`,
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_ekklesia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

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
              <h1 className="text-4xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground">Estatísticas e análises de atendimento</p>
            </div>
          </div>

          <Button onClick={exportToCSV} size="lg">
            <Download className="w-5 h-5 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Geral</span>
            </div>
            <p className="text-3xl font-bold">{totalTickets}</p>
            <p className="text-xs text-muted-foreground mt-1">senhas geradas</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Concluídos</span>
            </div>
            <p className="text-3xl font-bold text-success">{totalCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTickets > 0 ? Math.round((totalCompleted / totalTickets) * 100) : 0}% do total
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Aguardando</span>
            </div>
            <p className="text-3xl font-bold text-accent">{totalWaiting}</p>
            <p className="text-xs text-muted-foreground mt-1">na fila</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-secondary" />
              <span className="text-sm text-muted-foreground">Hoje</span>
            </div>
            <p className="text-3xl font-bold text-secondary">{todayTotal}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayCompleted} concluídos</p>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Relatório Diário</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-md border border-input bg-background"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total do Dia</p>
              <p className="text-2xl font-bold">{todayTotal}</p>
            </div>
            <div className="p-4 bg-success/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Concluídos</p>
              <p className="text-2xl font-bold text-success">{todayCompleted}</p>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-accent">
                {todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Por Especialidade</h2>
          <div className="space-y-4">
            {serviceStats.map((stat) => (
              <div key={stat.prefix} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{stat.name}</h3>
                    <p className="text-sm text-muted-foreground">Prefixo: {stat.prefix}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stat.total}</p>
                    <p className="text-xs text-muted-foreground">atendimentos</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="p-3 bg-success/10 rounded">
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                    <p className="text-lg font-semibold text-success">{stat.completed}</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded">
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-lg font-semibold text-accent">{stat.pending}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded">
                    <p className="text-xs text-muted-foreground">Tempo Médio</p>
                    <p className="text-lg font-semibold text-primary">{stat.avgWaitMinutes}m</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
