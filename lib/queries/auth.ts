import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
  providers: ['auth', 'providers'] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: () => api.auth.me(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useAuthProvidersQuery() {
  return useQuery({
    queryKey: authQueryKeys.providers,
    queryFn: () => api.auth.providers(),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
