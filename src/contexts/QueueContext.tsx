import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Ticket, ServiceType, TicketType, ServiceConfig, DEFAULT_SERVICES, ClientData } from '@/types/queue';

interface QueueContextType {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  services: ServiceConfig[];
  generateTicket: (service: ServiceType, type: TicketType, clientData?: ClientData) => Ticket;
  callNextTicket: (service?: ServiceType) => void;
  completeTicket: (ticketId: string) => void;
  getWaitingTickets: (service?: ServiceType) => Ticket[];
  addService: (service: ServiceConfig) => void;
  updateService: (serviceId: string, service: ServiceConfig) => void;
  deleteService: (serviceId: string) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('queue-tickets');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
        calledAt: t.calledAt ? new Date(t.calledAt) : undefined,
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }));
    }
    return [];
  });
  
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(() => {
    const saved = localStorage.getItem('queue-current-ticket');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.timestamp) {
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp),
          calledAt: parsed.calledAt ? new Date(parsed.calledAt) : undefined,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        };
      }
    }
    return null;
  });
  
  const [services, setServices] = useState<ServiceConfig[]>(() => {
    const saved = localStorage.getItem('queue-services');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
  });

  useEffect(() => {
    localStorage.setItem('queue-tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('queue-current-ticket', JSON.stringify(currentTicket));
  }, [currentTicket]);

  useEffect(() => {
    localStorage.setItem('queue-services', JSON.stringify(services));
  }, [services]);

  const generateTicket = useCallback((service: ServiceType, type: TicketType, clientData?: ClientData): Ticket => {
    const serviceTickets = tickets.filter(t => t.service === service);
    const lastNumber = serviceTickets.length > 0 
      ? Math.max(...serviceTickets.map(t => parseInt(t.number.split('-')[1])))
      : 0;
    
    const newNumber = lastNumber + 1;
    const prefix = type === 'priority' ? 'P' : 'N';
    
    const ticket: Ticket = {
      id: `${service}-${Date.now()}`,
      number: `${prefix}-${newNumber.toString().padStart(3, '0')}`,
      type,
      service,
      timestamp: new Date(),
      status: 'waiting',
      clientData,
    };

    setTickets(prev => [...prev, ticket]);
    return ticket;
  }, [tickets]);

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

  const callNextTicket = useCallback((service?: ServiceType) => {
    const waiting = getWaitingTickets(service);
    if (waiting.length === 0) return;

    const nextTicket = waiting[0];
    setTickets(prev =>
      prev.map(t =>
        t.id === nextTicket.id
          ? { ...t, status: 'called' as const, calledAt: new Date() }
          : t
      )
    );
    setCurrentTicket({ ...nextTicket, status: 'called', calledAt: new Date() });
  }, [getWaitingTickets]);

  const completeTicket = useCallback((ticketId: string) => {
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? { ...t, status: 'completed' as const, completedAt: new Date() }
          : t
      )
    );
    if (currentTicket?.id === ticketId) {
      setCurrentTicket(null);
    }
  }, [currentTicket]);

  const addService = useCallback((service: ServiceConfig) => {
    setServices(prev => [...prev, service]);
  }, []);

  const updateService = useCallback((serviceId: string, service: ServiceConfig) => {
    setServices(prev => prev.map(s => s.id === serviceId ? service : s));
  }, []);

  const deleteService = useCallback((serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
  }, []);

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
