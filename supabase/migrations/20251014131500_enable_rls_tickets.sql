-- Habilitar Row Level Security para tabela tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Comentário para controle
COMMENT ON TABLE public.tickets IS 'RLS habilitado; políticas definidas em migrations anteriores';