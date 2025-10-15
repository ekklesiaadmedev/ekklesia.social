import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
}

/**
 * Hook otimizado para queries com cache inteligente e debounce
 */
export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  cacheTime = 5 * 60 * 1000, // 5 minutos
  staleTime = 2 * 60 * 1000, // 2 minutos
  refetchOnWindowFocus = false,
  refetchOnMount = true,
  ...options
}: OptimizedQueryOptions<T>) {
  const lastFetchTime = useRef<number>(0);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  const optimizedQueryFn = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: evita múltiplas requisições em sequência rápida
    if (now - lastFetchTime.current < 1000) {
      return new Promise<T>((resolve) => {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        
        debounceTimeout.current = setTimeout(async () => {
          lastFetchTime.current = Date.now();
          const result = await queryFn();
          resolve(result);
        }, 500);
      });
    }

    lastFetchTime.current = now;
    return queryFn();
  }, [queryFn]);

  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    cacheTime,
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}