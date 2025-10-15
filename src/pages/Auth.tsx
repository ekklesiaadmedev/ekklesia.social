import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LogIn, Loader2, Mail, Eye, EyeOff, Lock } from 'lucide-react';
import logo from "../../anexos/logo_min_ekklesia.png";
import { supabase } from '@/integrations/supabase/client';
import { InlineSpinner } from '@/components/ui/spinner';
import { notifyError } from '@/utils/error';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, user, profileLoaded } = useAuth();

  useEffect(() => {
    // Só redireciona após o perfil estar totalmente carregado
    if (user && profileLoaded) {
      navigate('/');
    }
  }, [user, profileLoaded, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Informe seu e-mail para enviar o link');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast.error(`Erro ao enviar link: ${error.message}`);
        return;
      }
      toast.success('Enviamos um link de redefinição de senha para seu e-mail.');
    } catch (err: unknown) {
      setLoading(false);
      notifyError(err, 'Falha ao enviar link de redefinição');
    }
  };

  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid login')) {
        toast.error('E-mail ou senha incorretos, ou a conta não existe neste projeto.');
        // Fallback: tenta registrar automaticamente no projeto atual
        try {
          const normalizedEmail = email.trim().toLowerCase();
          const normalizedPassword = password.trim();
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: {
              emailRedirectTo: window.location.origin,
              data: { full_name: 'Social Admin' },
            },
          });
          if (signUpError) {
            console.warn('[Auth] signUp fallback falhou:', signUpError.message);
            toast.error(`Registro não concluído: ${signUpError.message}`);
          } else {
            console.info('[Auth] signUp fallback bem-sucedido:', signUpData);
            toast.success('Conta criada neste projeto. Verifique seu e-mail para confirmar e então faça login.');
          }
        } catch (signupCatch: unknown) {
          const catchText = signupCatch instanceof Error ? signupCatch.message : 'Erro ao tentar registrar';
          console.error('[Auth] signUp fallback erro:', catchText);
          toast.error(`Erro de registro: ${catchText}`);
        }
      } else if (msg.includes('confirm') || msg.includes('not confirmed')) {
        toast.error('E-mail não confirmado. Verifique sua caixa de entrada.');
      } else {
        toast.error(`Falha ao entrar: ${error.message}`);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  // DEBUG: Adicionar botão temporário para criar usuário admin
  const createTempAdmin = async () => {
    console.log('🔧 [DEBUG] Criando usuário admin temporário...');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@ekklesia.com',
        password: 'admin123',
        options: {
          data: {
            full_name: 'Administrador Social',
            role: 'admin'
          }
        }
      });
      
      if (error) {
        console.error('❌ [DEBUG] Erro ao criar admin:', error);
        toast.error('Erro ao criar usuário admin: ' + error.message);
      } else {
        console.log('✅ [DEBUG] Admin criado com sucesso:', data);
        toast.success('Usuário admin criado! Email: admin@ekklesia.com, Senha: admin123');
      }
    } catch (err) {
      console.error('❌ [DEBUG] Erro inesperado:', err);
      toast.error('Erro inesperado ao criar admin');
    }
  };

  const createAdminUser = async () => {
    try {
      const adminEmail = 'admin@ekklesia.social';
      const adminPassword = 'admin123';
      
      const { data, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: 'Administrador'
          }
        }
      });
      
      if (error) {
        console.error('Erro ao criar admin:', error);
        toast.error(`Erro ao criar admin: ${error.message}`);
        return;
      }
      
      toast.success('Admin criado! Email: admin@ekklesia.social | Senha: admin123');
    } catch (e: unknown) {
      notifyError(e, 'Erro inesperado ao criar admin');
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* Coluna esquerda: branding + formulário */}
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-md p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <img src={logo} alt="Ministério Ekklesia" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold leading-tight">Ekklesia Social</h1>
                <p className="text-muted-foreground text-sm">Acesse sua conta</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" onClick={handleForgotPassword} className="ml-auto text-sm underline-offset-4 hover:underline">
                    Esqueci minha senha
                  </a>
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

               <Button type="submit" className="w-full" size="lg" disabled={loading}>
                 {loading ? (
                   <InlineSpinner size="sm" text="Entrando..." />
                 ) : (
                   <>
                     <LogIn className="w-5 h-5 mr-2" />
                     Entrar
                   </>
                 )}
               </Button>
               
               {/* DEBUG: Botão temporário para criar admin */}
               <div className="mt-4 pt-4 border-t border-muted">
                 <p className="text-xs text-muted-foreground mb-2 text-center">
                   Desenvolvimento - Criar usuário admin temporário
                 </p>
                 <Button 
                   type="button" 
                   variant="outline" 
                   size="sm" 
                   className="w-full text-xs"
                   onClick={createTempAdmin}
                   disabled={loading}
                 >
                   Criar Admin (admin@ekklesia.com / admin123)
                 </Button>
               </div>
               
             </form>
            
          </Card>
        </div>
      </div>

      {/* Coluna direita: imagem */}
      <div className="bg-muted relative hidden lg:block">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <img
            src={logo}
            alt="Ekklesia Social"
            className="max-h-[60%] w-auto object-contain drop-shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;
