import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Props = {
  roles: Array<'admin' | 'triage' | 'service' | 'panel'>;
  children: React.ReactNode;
};

export const RoleRoute: React.FC<Props> = ({ roles, children }) => {
  const { loading, user, profile, profileLoaded, isAdmin, isTriage, isService } = useAuth();

  const isLoading = useMemo(() => {
    const stillLoading = loading || (!user && !profileLoaded);
    return stillLoading;
  }, [loading, profileLoaded, user]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🎯 [CORREÇÃO CRÍTICA] Usar roles calculados do AuthContext em vez de profile.role
  const userRoles = {
    admin: isAdmin,
    triage: isTriage,
    service: isService,
    panel: true // panel é sempre acessível para usuários logados
  };

  // Verificar se o usuário tem pelo menos um dos roles requeridos
  const hasAccess = roles.some(role => {
    const roleAccess = userRoles[role];
    return roleAccess;
  });
  
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default RoleRoute;