import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoaded } = useAuth();

  console.log('🛡️ ProtectedRoute - Estado:', { 
    hasUser: !!user, 
    loading, 
    profileLoaded,
    userEmail: user?.email 
  });

  // Aguarda carregamento inicial de auth/perfil antes de decidir
  const isLoading = useMemo(() => {
    const stillLoading = loading || (!user && !profileLoaded);
    console.log('🔄 ProtectedRoute - isLoading:', stillLoading);
    return stillLoading;
  }, [loading, profileLoaded, user]);

  if (isLoading) {
    console.log('⏳ ProtectedRoute - Aguardando autenticação/perfil...');
    return <div>Carregando...</div>;
  }

  // Após carregar, se não tem usuário, redireciona para login
  if (!user) {
    console.log('❌ ProtectedRoute - Sem usuário, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute - Renderizando children');
  return <>{children}</>;
}

export default ProtectedRoute;
