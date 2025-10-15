export type ServiceType = string;

export type TicketType = 'normal' | 'priority';

export interface ClientData {
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
}

export interface Ticket {
  id: string;
  number: string;
  type: TicketType;
  service: ServiceType;
  timestamp: Date;
  status: 'waiting' | 'called' | 'completed' | 'canceled';
  calledAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  notes?: string;
  attendantId?: string;
  clientData?: ClientData;
}

export interface ServiceConfig {
  id: string;
  name: string;
  prefix: string;
  icon: string;
  color: string;
  paused?: boolean;
  maxTickets?: number | null;
}
