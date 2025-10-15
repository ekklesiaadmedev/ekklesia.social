import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LockKeyhole } from 'lucide-react';
import { InlineSpinner } from '@/components/ui/spinner';
import { notifyError } from '@/utils/error';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);
      // É necessário estar em sessão de recuperação (via link do e-mail)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        toast.error('Link de recuperação inválido ou expirado. Solicite novamente.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        toast.error(`Erro ao atualizar senha: ${error.message}`);
        return;
      }
      toast.success('Senha atualizada com sucesso!');
      navigate('/login');
    } catch (err: unknown) {
      setLoading(false);
      notifyError(err, 'Falha ao atualizar senha');
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-md p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <LockKeyhole className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold leading-tight">Redefinir senha</h1>
                <p className="text-muted-foreground text-sm">Digite a nova senha para sua conta</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <InlineSpinner size="sm" text="Atualizando..." />
                ) : (
                  <>Salvar nova senha</>
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/login')} disabled={loading}>
                Voltar ao login
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block" />
    </div>
  );
};

export default ResetPassword;