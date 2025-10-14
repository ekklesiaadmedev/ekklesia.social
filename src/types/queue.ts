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
  status: 'waiting' | 'called' | 'completed';
  calledAt?: Date;
  completedAt?: Date;
  clientData?: ClientData;
}

export interface ServiceConfig {
  id: string;
  name: string;
  prefix: string;
  icon: string;
  color: string;
}

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: 'cadastro',
    name: 'Cadastro',
    prefix: 'CA',
    icon: 'UserPlus',
    color: 'primary',
  },
  {
    id: 'documentacao',
    name: 'Documentação',
    prefix: 'DC',
    icon: 'FileText',
    color: 'secondary',
  },
  {
    id: 'alimentacao',
    name: 'Alimentação',
    prefix: 'AL',
    icon: 'Utensils',
    color: 'accent',
  },
  {
    id: 'assistencia',
    name: 'Assistência',
    prefix: 'AS',
    icon: 'Heart',
    color: 'destructive',
  },
];
