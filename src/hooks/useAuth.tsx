import { useAuthContext } from '@/contexts/AuthContext';

// Hook fino que apenas consome o contexto centralizado
export const useAuth = () => {
  return useAuthContext();
};
