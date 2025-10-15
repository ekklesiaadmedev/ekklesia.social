-- Adicionar unicidade e função RPC para geração de números de senha

-- Garantir unicidade de ticket_number
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_ticket_number_unique UNIQUE (ticket_number);

-- Tabela de contadores por serviço para geração sequencial
CREATE TABLE IF NOT EXISTS public.service_counters (
  service_id text PRIMARY KEY REFERENCES public.services(service_id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

-- Função para gerar ticket_number de forma transacional e sequencial
CREATE OR REPLACE FUNCTION public.generate_ticket_number(service_id text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  pfx text;
  next_num integer;
BEGIN
  -- Obter prefixo do serviço
  SELECT s.prefix INTO pfx FROM public.services s WHERE s.service_id = service_id;
  IF pfx IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: %', service_id;
  END IF;

  -- Incrementar contador de forma atômica
  INSERT INTO public.service_counters(service_id, last_number)
  VALUES (service_id, 1)
  ON CONFLICT (service_id)
  DO UPDATE SET last_number = public.service_counters.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN pfx || '-' || LPAD(next_num::text, 3, '0');
END;
$$;

-- Comentário para documentação da RPC
COMMENT ON FUNCTION public.generate_ticket_number(text) IS 'Gera um ticket_number sequencial por serviço com base no prefixo';