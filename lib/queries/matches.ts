import { useInfiniteQuery } from '@tanstack/react-query';
import { api, MatchesCondition, MatchesMarket, MatchesPage, MatchesSort } from '../api';

export const MATCHES_PAGE_SIZE = 20;

export type MatchesFilterState = {
  sort: MatchesSort;
  market: MatchesMarket;
  condition: MatchesCondition;
  minScore: number;
};

export const DEFAULT_MATCHES_FILTER: MatchesFilterState = {
  sort: 'newest',
  market: 'all',
  condition: 'all',
  minScore: 0,
};

export function computeHasMore(offset: number, itemsLength: number, total: number): boolean {
  return offset + itemsLength < total;
}

export function buildMatchesQueryKey(
  missionId: number,
  filter: MatchesFilterState,
  pageSize: number,
) {
  return [
    'matches',
    'paginated',
    missionId,
    filter.sort,
    filter.market,
    filter.condition,
    filter.minScore,
    pageSize,
  ] as const;
}

export function useMatchesInfiniteQuery(
  activeMissionId: number,
  filter: MatchesFilterState = DEFAULT_MATCHES_FILTER,
  limit: number = MATCHES_PAGE_SIZE,
) {
  return useInfiniteQuery<MatchesPage>({
    queryKey: buildMatchesQueryKey(activeMissionId, filter, limit),
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      api.matches.list({
        limit,
        offset: pageParam as number,
        mission_id: activeMissionId > 0 ? activeMissionId : undefined,
        sort: filter.sort,
        market: filter.market,
        condition: filter.condition,
        min_score: filter.minScore,
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
