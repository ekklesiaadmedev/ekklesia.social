-- Criar tabela de serviços
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id text NOT NULL UNIQUE,
  name text NOT NULL,
  prefix text NOT NULL UNIQUE,
  icon text NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode visualizar serviços
CREATE POLICY "Anyone can view services"
ON public.services
FOR SELECT
USING (true);

-- Política: Apenas autenticados podem inserir/atualizar/deletar serviços
CREATE POLICY "Authenticated users can manage services"
ON public.services
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Criar tabela de tickets/senhas
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL,
  type text NOT NULL CHECK (type IN ('normal', 'priority')),
  service_id text NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'completed')),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  called_at timestamp with time zone,
  completed_at timestamp with time zone,
  client_name text,
  client_cpf text,
  client_phone text,
  client_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (service_id) REFERENCES public.services(service_id) ON DELETE CASCADE
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode visualizar tickets
CREATE POLICY "Anyone can view tickets"
ON public.tickets
FOR SELECT
USING (true);

-- Política: Qualquer pessoa pode inserir tickets (gerar senha)
CREATE POLICY "Anyone can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (true);

-- Política: Apenas autenticados podem atualizar/deletar tickets
CREATE POLICY "Authenticated users can manage tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tickets"
ON public.tickets
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Inserir serviços padrão
INSERT INTO public.services (service_id, name, prefix, icon, color) VALUES
  ('cadastro', 'Cadastro', 'CA', 'UserPlus', 'primary'),
  ('documentacao', 'Documentação', 'DC', 'FileText', 'secondary'),
  ('alimentacao', 'Alimentação', 'AL', 'Utensils', 'accent'),
  ('assistencia', 'Assistência', 'AS', 'Heart', 'destructive');

-- Criar índices para performance
CREATE INDEX idx_tickets_service_id ON public.tickets(service_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_timestamp ON public.tickets(timestamp);

-- Habilitar realtime para tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;