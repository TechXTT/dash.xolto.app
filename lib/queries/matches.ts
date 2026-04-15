import { useQuery } from '@tanstack/react-query';
import { api, Listing } from '../api';

const MATCHES_FETCH_LIMIT = 200;

async function fetchMatches(activeMissionId: number): Promise<Listing[]> {
  if (activeMissionId > 0) {
    const response = await api.missions.matches(activeMissionId, { limit: MATCHES_FETCH_LIMIT });
    return response.listings ?? [];
  }
  const response = await api.listings.feed();
  return response.listings ?? [];
}

export function useMatchesFeedQuery(activeMissionId: number) {
  return useQuery({
    queryKey: ['matches', 'feed', activeMissionId],
    queryFn: () => fetchMatches(activeMissionId),
    refetchOnWindowFocus: false,
  });
}
