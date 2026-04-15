import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export const adminQueryKeys = {
  stats: (days: number) => ['admin', 'stats', days] as const,
  users: () => ['admin', 'users'] as const,
  usage: (days: number) => ['admin', 'usage', days] as const,
};

export function useAdminStatsQuery(days: number, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.stats(days),
    queryFn: () => api.admin.stats(days).then((res) => res.stats),
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useAdminUsersQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => api.admin.users().then((res) => res.users ?? []),
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useAdminUsageQuery(days: number, enabled: boolean) {
  return useQuery({
    queryKey: adminQueryKeys.usage(days),
    queryFn: () => api.admin.usage(days).then((res) => res.entries ?? []),
    enabled,
    refetchOnWindowFocus: false,
  });
}
