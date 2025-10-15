import { ReactNode, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LockKeyhole } from 'lucide-react';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  console.log('🔐 [ADMIN_ROUTE] AdminRoute carregado!');
  
  const { user, loading, profileLoaded, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  console.log('👑 AdminRoute - Estado:', { 
    hasUser: !!user, 
    loading, 
    profileLoaded,
    isAdmin,
    userEmail: user?.email 
  });

  const isLoading = useMemo(() => {
    const stillLoading = loading || (!user && !profileLoaded);
    console.log('🔄 AdminRoute - isLoading:', stillLoading);
    return stillLoading;
  }, [loading, profileLoaded, user]);

  if (isLoading) {
    console.log('⏳ AdminRoute - Aguardando autenticação/perfil...');
    return <div>Carregando...</div>;
  }

  if (!user) {
    console.log('❌ AdminRoute - Sem usuário, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Verifica admin por email se não tem perfil
  if (!isAdmin && user) {
    console.log('⚠️ AdminRoute - Verificando admin por email...');
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@ekklesia.com')
      .split(',')
      .map(e => e.trim().toLowerCase());
    
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      console.log('👑 AdminRoute - Admin por email, permitindo acesso');
      return <>{children}</>;
    }

    console.log('❌ AdminRoute - Não é admin, mostrando tela de acesso negado');
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <Card className="max-w-xl w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <LockKeyhole className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold">Acesso administrativo necessário</h2>
          <p className="text-muted-foreground">
            Esta área é restrita a administradores. Entre com uma conta de administrador
            ou peça que um administrador atribua o papel adequado ao seu usuário.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
            <Button onClick={() => navigate('/login')}>Trocar conta</Button>
            <Button variant="ghost" onClick={() => { signOut(); navigate('/login'); }}>
              Sair
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  console.log('✅ AdminRoute - Admin confirmado, renderizando children');
  return <>{children}</>;
};

export default AdminRoute;