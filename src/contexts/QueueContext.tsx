import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Ticket, ServiceType, TicketType, ServiceConfig, ClientData } from '@/types/queue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyError } from '@/utils/error';

interface QueueContextType {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  services: ServiceConfig[];
  displayMessage: string;
  setDisplayMessage: (message: string) => void;
  updateDisplayMessage: (message: string) => void;
  generateTicket: (service: ServiceType, type: TicketType, clientData?: ClientData) => Promise<Ticket>;
  callNextTicket: (service?: ServiceType) => Promise<void>;
  recallTicket: (ticketId: string) => Promise<void>;
  cancelTicket: (ticketId: string, notes?: string) => Promise<void>;
  reissueTicket: (ticketId: string) => Promise<Ticket | null>;
  requeueTicketByNumber: (ticketNumber: string) => Promise<void>;
  completeTicket: (ticketId: string) => Promise<void>;
  getWaitingTickets: (service?: ServiceType) => Ticket[];
  getServiceHistory: (service: ServiceType) => Ticket[];
  setServicePause: (serviceId: string, paused: boolean) => Promise<void>;
  addService: (service: ServiceConfig) => Promise<void>;
  updateService: (serviceId: string, service: ServiceConfig) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
}

export const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [displayMessage, setDisplayMessage] = useState<string>('');
  const queryClient = useQueryClient();
  const messageChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // React Query: Services
  const servicesQuery = useQuery<ServiceConfig[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at');
      if (error) throw error;
      const serviceConfigs: ServiceConfig[] = (data ?? []).map(s => ({
        id: s.service_id,
        name: s.name,
        prefix: s.prefix,
        icon: s.icon,
        color: s.color,
        paused: 'paused' in s ? !!s.paused : false,
        maxTickets: 'max_tickets' in s ? (s.max_tickets as number | null) : null,
      }));
      return serviceConfigs;
    },
    staleTime: 30_000,
  });

  // React Query: Tickets
  const ticketsQuery = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('timestamp', { ascending: true });
      if (error) throw error;
      const ticketData: Ticket[] = (data ?? []).map(t => ({
        id: t.id,
        number: t.ticket_number,
        type: t.type as TicketType,
        service: t.service_id,
        timestamp: new Date(t.timestamp),
        status: t.status as Ticket['status'],
        calledAt: t.called_at ? new Date(t.called_at) : undefined,
        completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        canceledAt: t.canceled_at ? new Date(t.canceled_at) : undefined,
        notes: t.notes || undefined,
        attendantId: t.attendant_id || undefined,
        clientData: t.client_name ? {
          name: (t.client_name as string).toUpperCase(),
          cpf: t.client_cpf || undefined,
          phone: t.client_phone || undefined,
          email: t.client_email || undefined,
        } : undefined,
      }));
      return ticketData;
    },
    staleTime: 10_000,
  });

  // Sync local state with queries
  useEffect(() => {
    if (servicesQuery.data) {
      setServices(servicesQuery.data);
    }
  }, [servicesQuery.data]);

  useEffect(() => {
    if (ticketsQuery.data) {
      setTickets(ticketsQuery.data);
      const called = ticketsQuery.data.find(t => t.status === 'called');
      setCurrentTicket(called || null);
    }
  }, [ticketsQuery.data]);

  // Load services from Supabase
  const loadServices = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error loading services:', error);
      return;
    }

    if (data) {
      const serviceConfigs: ServiceConfig[] = data.map(s => ({
        id: s.service_id,
        name: s.name,
        prefix: s.prefix,
        icon: s.icon,
        color: s.color,
      }));
      setServices(serviceConfigs);
    }
  }, []);

  // Load tickets from Supabase
  const loadTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error loading tickets:', error);
      return;
    }

    if (data) {
      const ticketData: Ticket[] = data.map(t => ({
        id: t.id,
        number: t.ticket_number,
        type: t.type as TicketType,
        service: t.service_id,
        timestamp: new Date(t.timestamp),
        status: t.status as 'waiting' | 'called' | 'completed',
        calledAt: t.called_at ? new Date(t.called_at) : undefined,
        completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
        clientData: t.client_name ? {
          name: (t.client_name as string).toUpperCase(),
          cpf: t.client_cpf || undefined,
          phone: t.client_phone || undefined,
          email: t.client_email || undefined,
        } : undefined,
      }));
      setTickets(ticketData);
      
      // Set current ticket (the last called one)
      const called = ticketData.find(t => t.status === 'called');
      if (called) {
        setCurrentTicket(called);
      }
    }
  }, []);

  // Initial queries are handled by React Query (no manual load needed)

  // Real-time subscription for tickets
  useEffect(() => {
    const subscribeTickets = () => {
      const channel = supabase
        .channel('tickets-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tickets' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tickets' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'tickets' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Attempt reconnection after a short delay
            setTimeout(() => {
              supabase.removeChannel(channel);
              subscribeTickets();
            }, 2000);
          }
        });
      return channel;
    };

    const channel = subscribeTickets();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Broadcast: painel message (receber de qualquer cliente)
  useEffect(() => {
    const subscribePanelMessage = () => {
      const channel = supabase
        .channel('panel-message')
        .on('broadcast', { event: 'panel_message' }, (payload) => {
          try {
            const raw = (payload as unknown as { payload?: unknown }).payload;
            let msg = '';
            if (raw && typeof raw === 'object' && raw !== null && 'message' in raw) {
              const m = (raw as Record<string, unknown>).message;
              msg = typeof m === 'string' ? m : '';
            }
            setDisplayMessage(msg);
          } catch (e) {
            console.warn('Falha ao processar mensagem do painel:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            messageChannelRef.current = channel;
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setTimeout(() => {
              supabase.removeChannel(channel);
              subscribePanelMessage();
            }, 2000);
          }
        });
      return channel;
    };

    const channel = subscribePanelMessage();
    return () => {
      messageChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, []);

  const updateDisplayMessage = useCallback((message: string) => {
    const trimmed = (message || '').trim();
    setDisplayMessage(trimmed);
    try {
      const channel = messageChannelRef.current ?? supabase.channel('panel-message');
      // Se ainda não inscrito, tenta enviar assim mesmo; Supabase trata internamente
      channel.send({ type: 'broadcast', event: 'panel_message', payload: { message: trimmed } });
      messageChannelRef.current = channel;
    } catch (e) {
      console.warn('Falha ao enviar mensagem de painel via broadcast:', e);
    }
  }, []);


  const generateTicket = useCallback(async (service: ServiceType, type: TicketType, clientData?: ClientData): Promise<Ticket> => {
    // Bloquear geração se serviço estiver pausado
    const serviceConfigPause = services.find(s => s.id === service);
    if (serviceConfigPause?.paused) {
      throw new Error('Geração de senhas está pausada para este serviço.');
    }

    // Limitar quantidade máxima por dia (se configurado)
    if (serviceConfigPause?.maxTickets && serviceConfigPause.maxTickets > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { count, error: countErr } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', service)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());
      if (countErr) console.warn('Erro ao contar tickets do dia:', countErr);
      if ((count ?? 0) >= (serviceConfigPause.maxTickets ?? 0)) {
        throw new Error('Limite máximo de senhas atingido para este serviço hoje.');
      }
    }
    // Tenta gerar número via RPC; se falhar, faz fallback baseado no último número do serviço
    let ticketNumber: string | null = null;
    try {
      const { data: generatedNumber, error: rpcError } = await supabase.rpc('generate_ticket_number', {
        service_id: service,
      });
      if (rpcError) throw rpcError;
      ticketNumber = generatedNumber as string;
    } catch (rpcError) {
      console.warn('RPC generate_ticket_number falhou, usando fallback:', rpcError);
      const serviceConfig = services.find(s => s.id === service);
      const prefix = serviceConfig?.prefix ?? 'SN';

      // Busca último ticket do serviço e incrementa de forma simples
      const { data: lastTickets, error: lastErr } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('service_id', service)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (lastErr) {
        console.error('Erro buscando último ticket:', lastErr);
      }

      const last = lastTickets && lastTickets[0]?.ticket_number as string | undefined;
      const match = last ? last.match(new RegExp(`^${prefix}(?:P)?-(\\d+)$`, 'i')) : null;
      const lastNum = match ? parseInt(match[1], 10) : 0;
      const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
      ticketNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }

    // Normalizar o formato: PREFIXO(+P para prioritário)-NNN
    const serviceConfig = services.find(s => s.id === service);
    const prefix = serviceConfig?.prefix ?? 'SN';
    const seqMatch = ticketNumber?.match(/(\d+)$/);
    const seq = seqMatch ? seqMatch[1] : '1';
    const seqPadded = seq.length >= 3 ? seq : String(parseInt(seq, 10) || 1).toString().padStart(3, '0');
    ticketNumber = `${prefix}${type === 'priority' ? 'P' : ''}-${seqPadded}`;

    // Inserir no Supabase
    // Normaliza dados do cliente para maiúsculas
    const normalizedClientData = clientData ? {
      ...clientData,
      name: (clientData.name || '').trim().toUpperCase(),
    } : undefined;

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber!,
        type,
        service_id: service,
        status: 'waiting',
        client_name: normalizedClientData?.name,
        client_cpf: normalizedClientData?.cpf,
        client_phone: normalizedClientData?.phone,
        client_email: normalizedClientData?.email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error generating ticket:', error);
      throw error;
    }

    const ticket: Ticket = {
      id: data.id,
      number: ticketNumber!,
      type,
      service,
      timestamp: new Date(data.timestamp),
      status: 'waiting',
      clientData: normalizedClientData,
    };

    return ticket;
  }, [services]);

  const getWaitingTickets = useCallback((service?: ServiceType): Ticket[] => {
    let waiting = tickets.filter(t => t.status === 'waiting');
    if (service) {
      waiting = waiting.filter(t => t.service === service);
    }
    // Priority tickets first
    return waiting.sort((a, b) => {
      if (a.type === 'priority' && b.type !== 'priority') return -1;
      if (a.type !== 'priority' && b.type === 'priority') return 1;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }, [tickets]);

  const callNextTicket = useCallback(async (service?: ServiceType) => {
    const waiting = getWaitingTickets(service);
    if (waiting.length === 0) return;

    const nextTicket = waiting[0];
    const { data: authUser } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'called',
        called_at: new Date().toISOString(),
        attendant_id: authUser.user?.id ?? null,
      })
      .eq('id', nextTicket.id);

    if (error) {
      notifyError(error, 'Erro ao chamar senha');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [getWaitingTickets, queryClient]);

  const recallTicket = useCallback(async (ticketId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'called',
        called_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      notifyError(error, 'Erro ao chamar novamente');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [queryClient]);

  // Triagem: recolocar senha na fila por número (volta a 'waiting')
  const requeueTicketByNumber = useCallback(async (ticketNumber: string) => {
    const { data: ticket, error: findErr } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('ticket_number', ticketNumber)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (findErr || !ticket) {
      notifyError(findErr || new Error('Senha não encontrada'), 'Erro ao localizar senha');
      return;
    }

    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'waiting',
        called_at: null,
        canceled_at: null,
      })
      .eq('id', ticket.id);

    if (error) {
      notifyError(error, 'Erro ao recolocar senha na fila');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    toast.success('Senha recolocada na fila com sucesso!');
  }, [queryClient]);

  const completeTicket = useCallback(async (ticketId: string, notes?: string) => {
    const { data: authUser } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes ?? null,
        attendant_id: authUser.user?.id ?? null,
      })
      .eq('id', ticketId);

    if (error) {
      notifyError(error, 'Erro ao concluir atendimento');
      return;
    }

    if (currentTicket?.id === ticketId) {
      setCurrentTicket(null);
    }

    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [currentTicket, queryClient]);

  const cancelTicket = useCallback(async (ticketId: string, notes?: string) => {
    const { data: authUser } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        notes: notes ?? null,
        attendant_id: authUser.user?.id ?? null,
      })
      .eq('id', ticketId);

    if (error) {
      notifyError(error, 'Erro ao cancelar senha');
      return;
    }

    if (currentTicket?.id === ticketId) {
      setCurrentTicket(null);
    }

    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  }, [currentTicket, queryClient]);

  const reissueTicket = useCallback(async (ticketId: string): Promise<Ticket | null> => {
    const original = tickets.find(t => t.id === ticketId);
    if (!original) return null;
    try {
      const newTicket = await generateTicket(original.service, original.type, original.clientData);
      toast.success('Senha reemitida com sucesso!');
      return newTicket;
    } catch (e) {
      notifyError(e, 'Erro ao reemitir senha');
      return null;
    }
  }, [tickets, generateTicket]);

  const getServiceHistory = useCallback((service: ServiceType): Ticket[] => {
    return tickets
      .filter(t => t.service === service && (t.status === 'called' || t.status === 'completed' || t.status === 'canceled'))
      .sort((a, b) => {
        const ta = a.calledAt?.getTime() || a.completedAt?.getTime() || a.canceledAt?.getTime() || 0;
        const tb = b.calledAt?.getTime() || b.completedAt?.getTime() || b.canceledAt?.getTime() || 0;
        return tb - ta;
      });
  }, [tickets]);

  const setServicePause = useCallback(async (serviceId: string, paused: boolean) => {
    const { error } = await supabase
      .from('services')
      .update({ paused })
      .eq('service_id', serviceId);
    if (error) {
      notifyError(error, 'Erro ao atualizar pausa do serviço');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['services'] });
  }, [queryClient]);

  const addService = useCallback(async (service: ServiceConfig) => {
    const { error } = await supabase
      .from('services')
      .insert({
        service_id: service.id,
        name: service.name,
        prefix: service.prefix,
        icon: service.icon,
        color: service.color,
        paused: service.paused ?? false,
        max_tickets: service.maxTickets ?? null,
      });

    if (error) {
      notifyError(error, 'Erro ao adicionar serviço');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['services'] });
    toast.success('Serviço adicionado com sucesso!');
  }, [queryClient]);

  const updateService = useCallback(async (serviceId: string, service: ServiceConfig) => {
    const { error } = await supabase
      .from('services')
      .update({
        name: service.name,
        prefix: service.prefix,
        icon: service.icon,
        color: service.color,
        paused: service.paused ?? false,
        max_tickets: service.maxTickets ?? null,
      })
      .eq('service_id', serviceId);

    if (error) {
      notifyError(error, 'Erro ao atualizar serviço');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['services'] });
    toast.success('Serviço atualizado com sucesso!');
  }, [queryClient]);

  const deleteService = useCallback(async (serviceId: string) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('service_id', serviceId);

    if (error) {
      notifyError(error, 'Erro ao deletar serviço');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['services'] });
    toast.success('Serviço deletado com sucesso!');
  }, [queryClient]);

  return (
    <QueueContext.Provider
      value={{
        tickets,
        currentTicket,
        services,
        displayMessage,
        setDisplayMessage,
        updateDisplayMessage,
        generateTicket,
        callNextTicket,
        completeTicket,
        recallTicket,
        cancelTicket,
        reissueTicket,
        requeueTicketByNumber,
        getWaitingTickets,
        getServiceHistory,
        setServicePause,
        addService,
        updateService,
        deleteService,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
