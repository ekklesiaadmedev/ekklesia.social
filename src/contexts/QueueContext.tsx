import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Ticket, ServiceType, TicketType, ServiceConfig, ClientData } from '@/types/queue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueueContextType {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  services: ServiceConfig[];
  generateTicket: (service: ServiceType, type: TicketType, clientData?: ClientData) => Promise<Ticket>;
  callNextTicket: (service?: ServiceType) => Promise<void>;
  completeTicket: (ticketId: string) => Promise<void>;
  getWaitingTickets: (service?: ServiceType) => Ticket[];
  addService: (service: ServiceConfig) => Promise<void>;
  updateService: (serviceId: string, service: ServiceConfig) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [services, setServices] = useState<ServiceConfig[]>([]);

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
          name: t.client_name,
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

  // Initial load
  useEffect(() => {
    loadServices();
    loadTickets();
  }, [loadServices, loadTickets]);

  // Real-time subscription for tickets
  useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTickets]);


  const generateTicket = useCallback(async (service: ServiceType, type: TicketType, clientData?: ClientData): Promise<Ticket> => {
    // Get service to use its prefix
    const serviceConfig = services.find(s => s.id === service);
    if (!serviceConfig) {
      throw new Error('Service not found');
    }

    // Get last ticket number for this service
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('ticket_number')
      .eq('service_id', service)
      .order('timestamp', { ascending: false })
      .limit(1);

    const lastNumber = existingTickets && existingTickets.length > 0
      ? parseInt(existingTickets[0].ticket_number.split('-')[1])
      : 0;

    const newNumber = lastNumber + 1;
    const ticketNumber = `${serviceConfig.prefix}-${newNumber.toString().padStart(3, '0')}`;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        type,
        service_id: service,
        status: 'waiting',
        client_name: clientData?.name,
        client_cpf: clientData?.cpf,
        client_phone: clientData?.phone,
        client_email: clientData?.email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error generating ticket:', error);
      throw error;
    }

    const ticket: Ticket = {
      id: data.id,
      number: ticketNumber,
      type,
      service,
      timestamp: new Date(data.timestamp),
      status: 'waiting',
      clientData,
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
    
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'called',
        called_at: new Date().toISOString(),
      })
      .eq('id', nextTicket.id);

    if (error) {
      console.error('Error calling ticket:', error);
      toast.error('Erro ao chamar senha');
      return;
    }

    await loadTickets();
  }, [getWaitingTickets, loadTickets]);

  const completeTicket = useCallback(async (ticketId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error completing ticket:', error);
      toast.error('Erro ao concluir atendimento');
      return;
    }

    if (currentTicket?.id === ticketId) {
      setCurrentTicket(null);
    }

    await loadTickets();
  }, [currentTicket, loadTickets]);

  const addService = useCallback(async (service: ServiceConfig) => {
    const { error } = await supabase
      .from('services')
      .insert({
        service_id: service.id,
        name: service.name,
        prefix: service.prefix,
        icon: service.icon,
        color: service.color,
      });

    if (error) {
      console.error('Error adding service:', error);
      toast.error('Erro ao adicionar especialidade');
      return;
    }

    await loadServices();
    toast.success('Especialidade adicionada com sucesso!');
  }, [loadServices]);

  const updateService = useCallback(async (serviceId: string, service: ServiceConfig) => {
    const { error } = await supabase
      .from('services')
      .update({
        name: service.name,
        prefix: service.prefix,
        icon: service.icon,
        color: service.color,
      })
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar especialidade');
      return;
    }

    await loadServices();
    toast.success('Especialidade atualizada com sucesso!');
  }, [loadServices]);

  const deleteService = useCallback(async (serviceId: string) => {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error deleting service:', error);
      toast.error('Erro ao deletar especialidade');
      return;
    }

    await loadServices();
    toast.success('Especialidade deletada com sucesso!');
  }, [loadServices]);

  return (
    <QueueContext.Provider
      value={{
        tickets,
        currentTicket,
        services,
        generateTicket,
        callNextTicket,
        completeTicket,
        getWaitingTickets,
        addService,
        updateService,
        deleteService,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within QueueProvider');
  }
  return context;
};
