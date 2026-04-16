import { useInfiniteQuery } from '@tanstack/react-query';
import { api, MatchesPage } from '../api';

export const MATCHES_PAGE_SIZE = 20;

export function computeHasMore(offset: number, itemsLength: number, total: number): boolean {
  return offset + itemsLength < total;
}

export function useMatchesInfiniteQuery(
  activeMissionId: number,
  limit: number = MATCHES_PAGE_SIZE,
) {
  return useInfiniteQuery<MatchesPage>({
    queryKey: ['matches', 'paginated', activeMissionId, limit],
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      api.matches.list({
        limit,
        offset: pageParam as number,
        mission_id: activeMissionId > 0 ? activeMissionId : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return computeHasMore(lastPage.offset, lastPage.items.length, lastPage.total)
        ? nextOffset
        : undefined;
    },
    refetchOnWindowFocus: false,
  });
}
