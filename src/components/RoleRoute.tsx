import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Props = {
  roles: Array<'admin' | 'triage' | 'service' | 'panel'>;
  children: React.ReactNode;
};

export const RoleRoute: React.FC<Props> = ({ roles, children }) => {
  const { loading, user, profile, profileLoaded } = useAuth();

  console.log('🔐 RoleRoute - Estado:', { 
    hasUser: !!user, 
    loading, 
    profileLoaded,
    hasProfile: !!profile,
    userRole: profile?.role,
    requiredRoles: roles
  });

  const isLoading = useMemo(() => {
    const stillLoading = loading || (!user && !profileLoaded);
    console.log('🔄 RoleRoute - isLoading:', stillLoading);
    return stillLoading;
  }, [loading, profileLoaded, user]);

  if (isLoading) {
    console.log('⏳ RoleRoute - Aguardando autenticação/perfil...');
    return <div>Carregando...</div>;
  }

  if (!user) {
    console.log('❌ RoleRoute - Sem usuário, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Se tem usuário mas não tem perfil carregado, aplicar fallback por email
  if (!profile && user) {
    console.log('⚠️ RoleRoute - Usuário sem perfil, assumindo acesso básico');
    // Se é admin por email, permite acesso
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@ekklesia.com')
      .split(',')
      .map(e => e.trim().toLowerCase());
    
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      console.log('👑 RoleRoute - Admin por email, permitindo acesso');
      return <>{children}</>;
    }
    
    // Para rota que exige admin e não é admin por email, negar acesso
    if (roles.includes('admin')) {
      console.log('❌ RoleRoute - Sem perfil admin, negando acesso');
      return <Navigate to="/" replace />;
    }
  }

  const hasAccess = !!profile && roles.includes(profile.role);
  console.log('🔍 RoleRoute - Verificação de acesso:', { hasAccess, userRole: profile?.role, requiredRoles: roles });
  
  if (!hasAccess) {
    console.log('❌ RoleRoute - Sem permissão, redirecionando para home');
    return <Navigate to="/" replace />;
  }
  
  console.log('✅ RoleRoute - Acesso permitido, renderizando children');
  return <>{children}</>;
};

export default RoleRoute;