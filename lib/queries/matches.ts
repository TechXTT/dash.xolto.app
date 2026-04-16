import { useQuery } from '@tanstack/react-query';
import { api, Listing } from '../api';

export const MATCHES_FETCH_LIMIT = 50;

async function fetchMatches(activeMissionId: number, limit: number = MATCHES_FETCH_LIMIT): Promise<Listing[]> {
  if (activeMissionId > 0) {
    const response = await api.missions.matches(activeMissionId, { limit });
    return response.listings ?? [];
  }
  const response = await api.listings.feed();
  return response.listings ?? [];
}

export function useMatchesFeedQuery(activeMissionId: number, limit: number = MATCHES_FETCH_LIMIT) {
  return useQuery({
    queryKey: ['matches', 'feed', activeMissionId, limit],
    queryFn: () => fetchMatches(activeMissionId, limit),
    refetchOnWindowFocus: false,
  });
}
