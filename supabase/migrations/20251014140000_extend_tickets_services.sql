-- Estender esquema para suportar novos recursos

-- 1) Adicionar coluna 'paused' e 'max_tickets' em services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_tickets integer;

-- 2) Permitir status 'canceled' e campos auxiliares em tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS canceled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS attendant_id uuid;

-- Atualizar constraint de status, se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_tickets_status_check'
  ) THEN
    ALTER TABLE public.tickets
      DROP CONSTRAINT public_tickets_status_check;
  END IF;
END$$;

ALTER TABLE public.tickets
  ADD CONSTRAINT public_tickets_status_check
  CHECK (status IN ('waiting', 'called', 'completed', 'canceled'));

-- Habilitar realtime para services se necessário
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;

COMMENT ON COLUMN public.services.paused IS 'Quando true, bloqueia geração de senhas para o serviço';
COMMENT ON COLUMN public.services.max_tickets IS 'Limite máximo de senhas (por dia). Null para sem limite';
COMMENT ON COLUMN public.tickets.notes IS 'Observações do atendimento';
COMMENT ON COLUMN public.tickets.attendant_id IS 'Usuário que realizou o atendimento';
COMMENT ON COLUMN public.tickets.canceled_at IS 'Timestamp do cancelamento';