import { useAuthContext } from '@/contexts/auth-hooks';

// Hook fino que apenas consome o contexto centralizado
export const useAuth = () => {
  return useAuthContext();
};
