import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQueue } from '@/contexts/queue-hooks';
import { ArrowLeft, Download, FileText, BarChart3, Calendar as CalendarIcon, Users, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as DayCalendar } from '@/components/ui/calendar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';

const Reports = () => {
  const navigate = useNavigate();
  const { tickets, services } = useQueue();
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedAttendant, setSelectedAttendant] = useState<string>('all');
  const [attendants, setAttendants] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [loadingAttendants, setLoadingAttendants] = useState(true);

  useEffect(() => {
    // Carregar atendentes (profiles) para filtro por nome
    const loadAttendants = async () => {
      setLoadingAttendants(true);
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (!error) {
        setAttendants((data ?? []) as { id: string; full_name: string | null; email: string | null }[]);
      }
      setLoadingAttendants(false);
    };
    loadAttendants();
  }, []);

  const formatDateBR = (date: Date) => date.toLocaleDateString('pt-BR');
  const rangeLabel = (range: DateRange | undefined) => {
    if (!range || !range.from || !range.to) return formatDateBR(new Date());
    const from = formatDateBR(range.from);
    const to = formatDateBR(range.to);
    return from === to ? from : `${from} - ${to}`;
  };

  const periodTickets = tickets.filter(t => {
    if (!selectedRange || !selectedRange.from || !selectedRange.to) return false;
    const start = new Date(selectedRange.from);
    start.setHours(0,0,0,0);
    const end = new Date(selectedRange.to);
    end.setHours(23,59,59,999);
    const d = new Date(t.timestamp);
    return d >= start && d <= end;
  });

  const filteredTickets = useMemo(() => {
    return periodTickets.filter(t => {
      const serviceOk = selectedService === 'all' || t.service === selectedService;
      const attendantOk = selectedAttendant === 'all' || t.attendantId === selectedAttendant;
      return serviceOk && attendantOk;
    });
  }, [periodTickets, selectedService, selectedAttendant]);

  const totalTickets = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === 'completed').length;
  const totalWaiting = tickets.filter(t => t.status === 'waiting').length;
  const totalCalled = tickets.filter(t => t.status === 'called').length;

  const todayCompleted = filteredTickets.filter(t => t.status === 'completed').length;
  const todayTotal = filteredTickets.length;

  const serviceStats = services.map(service => {
    const serviceTickets = filteredTickets.filter(t => t.service === service.id);
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
    const headers = ['Senha', 'Tipo', 'Serviço', 'Status', 'Data/Hora', 'Cliente', 'Tempo de Espera'];
    const rows = filteredTickets.map(t => {
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório Ekklesia Social', 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
    
    // Summary stats
    doc.setFontSize(12);
    doc.text('Resumo Geral', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total de Senhas: ${totalTickets}`, 14, 48);
    doc.text(`Concluídos: ${totalCompleted} (${totalTickets > 0 ? Math.round((totalCompleted / totalTickets) * 100) : 0}%)`, 14, 54);
    doc.text(`Aguardando: ${totalWaiting}`, 14, 60);
    doc.text(`Chamados: ${totalCalled}`, 14, 66);

    // Table data
    const tableData = filteredTickets.map(t => {
      const service = services.find(s => s.id === t.service);
      const waitTime = t.calledAt 
        ? Math.round((t.calledAt.getTime() - t.timestamp.getTime()) / 60000) 
        : '-';
      return [
        t.number,
        t.type === 'priority' ? 'Prior.' : 'Normal',
        service?.name || '-',
        t.status === 'completed' ? 'Concl.' : t.status === 'called' ? 'Cham.' : 'Aguard.',
        new Date(t.timestamp).toLocaleString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        t.clientData?.name || '-',
        `${waitTime}m`,
      ];
    });

    autoTable(doc, {
      startY: 75,
      head: [['Senha', 'Tipo', 'Serv.', 'Status', 'Data/Hora', 'Cliente', 'Espera']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_ekklesia_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div id="conteudo" className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
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

          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportToCSV} size="lg" variant="outline" aria-label="Gerar relatório CSV" title="Gerar relatório CSV">
              <Download className="w-5 h-5 mr-2" />
              Gerar relatório (CSV)
            </Button>
            <Button onClick={exportToPDF} size="lg" aria-label="Gerar relatório PDF" title="Gerar relatório PDF">
              <FileText className="w-5 h-5 mr-2" />
              Gerar relatório (PDF)
            </Button>
          </div>
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
              <CalendarIcon className="w-5 h-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Período selecionado</span>
            </div>
            <p className="text-3xl font-bold text-secondary">{todayTotal}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayCompleted} concluídos</p>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Relatório por Período</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start text-left" aria-label="Selecionar período do relatório" title="Selecionar período do relatório">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  {rangeLabel(selectedRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2" align="end">
                <DayCalendar
                  mode="range"
                  selected={selectedRange}
                  onSelect={(range) => setSelectedRange(range)}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2 flex-wrap">
              <div className="min-w-[220px]">
                <Label>Serviço</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[220px]">
                <Label>Atendente</Label>
                <Select value={selectedAttendant} onValueChange={setSelectedAttendant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {loadingAttendants ? (
                      <div className="p-2">
                        <SkeletonLoader type="list" count={3} />
                      </div>
                    ) : (
                      attendants.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name || a.email || a.id}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
          <h2 className="text-2xl font-semibold mb-6">Por Serviço</h2>
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
