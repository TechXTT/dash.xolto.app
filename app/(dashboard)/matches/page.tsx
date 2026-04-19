'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ListingCard } from '../../../components/ListingCard';
import { useDashboardContext } from '../../../components/DashboardContext';
import {
  api,
  Listing,
  MatchesCondition,
  MatchesMarket,
  MatchesSort,
  OutreachStatus,
} from '../../../lib/api';
import {
  DEFAULT_MATCHES_FILTER,
  MATCHES_PAGE_SIZE,
  MatchesFilterState,
  useMatchesInfiniteQuery,
} from '../../../lib/queries/matches';
import { connectDealStream } from '../../../lib/sse';

type SortKey = MatchesSort;
type MarketplaceFilter = MatchesMarket;
type ConditionFilter = MatchesCondition;

const MARKETPLACE_LABELS: Record<MarketplaceFilter, string> = {
  all: 'All markets',
  marktplaats: 'Marktplaats',
  vinted_nl: 'Vinted NL',
  vinted_dk: 'Vinted DK',
  olxbg: 'OLX BG',
};

const CONDITION_LABELS: Record<ConditionFilter, string> = {
  all: 'Any condition',
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

// Ordering is UI-only; first entry is the default and displayed first.
const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  score: 'Best score',
  price_asc: 'Price: low → high',
  price_desc: 'Price: high → low',
};

// XOL-79: outreach filter chips — client-side only (does not change backend query)
const OUTREACH_FILTER_OPTIONS: { value: OutreachStatus; label: string }[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const MIN_SCORE_OPTIONS = [
  { value: 0, label: 'Any score' },
  { value: 6, label: 'Score ≥ 6' },
  { value: 7, label: 'Score ≥ 7' },
  { value: 8, label: 'Score ≥ 8' },
  { value: 9, label: 'Score ≥ 9' },
];

export default function MatchesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState('');
  const [draftStates, setDraftStates] = useState<
    Record<
      string,
      {
        loading: boolean;
        text: string | null;
        questions?: string[];
        offer_price?: number;
        lang?: 'bg' | 'nl' | 'en';
      }
    >
  >({});
  const [newCount, setNewCount] = useState(0);
  const {
    missions,
    activeMissionId,
    setActiveMission,
    shortlist,
    addToShortlist,
    isShortlisted,
    refreshMissions,
  } = useDashboardContext();

  const [sort, setSort] = useState<SortKey>(DEFAULT_MATCHES_FILTER.sort);
  const [marketplace, setMarketplace] = useState<MarketplaceFilter>(DEFAULT_MATCHES_FILTER.market);
  const [condition, setCondition] = useState<ConditionFilter>(DEFAULT_MATCHES_FILTER.condition);
  const [minScore, setMinScore] = useState(DEFAULT_MATCHES_FILTER.minScore);
  // XOL-79: outreach filter — client-side multi-select; empty = show all
  const [outreachFilters, setOutreachFilters] = useState<OutreachStatus[]>([]);

  const [recheckLoading, setRecheckLoading] = useState(false);
  const [recheckCooldownUntil, setRecheckCooldownUntil] = useState<Date | null>(null);
  const [recheckCooldownDisplay, setRecheckCooldownDisplay] = useState('');

  const [analyzeURL, setAnalyzeURL] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState<Listing | null>(null);
  const [analyzeSource, setAnalyzeSource] = useState('');

  const filterState = useMemo<MatchesFilterState>(
    () => ({ sort, market: marketplace, condition, minScore }),
    [sort, marketplace, condition, minScore],
  );

  const {
    data,
    error: matchesError,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMatchesInfiniteQuery(activeMissionId, filterState, MATCHES_PAGE_SIZE);

  const serverPages = useMemo(() => data?.pages ?? [], [data?.pages]);
  const flatListings = useMemo(() => serverPages.flatMap((p) => p.items ?? []), [serverPages]);
  const totalMatches = serverPages.length > 0 ? serverPages[serverPages.length - 1].total : 0;
  const isInitialLoading = isFetching && serverPages.length === 0;

  useEffect(() => {
    if (missions.length === 0) {
      void refreshMissions();
    }
  }, [missions.length, refreshMissions]);

  useEffect(() => {
    setNewCount(0);
    setDraftStates({});
    setRecheckCooldownUntil(null);
    setRecheckCooldownDisplay('');
  }, [activeMissionId]);

  useEffect(() => {
    if (!recheckCooldownUntil) return;
    const tick = () => {
      const secsLeft = Math.ceil((recheckCooldownUntil.getTime() - Date.now()) / 1000);
      if (secsLeft <= 0) {
        setRecheckCooldownUntil(null);
        setRecheckCooldownDisplay('');
        return;
      }
      const m = Math.floor(secsLeft / 60);
      const s = secsLeft % 60;
      setRecheckCooldownDisplay(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [recheckCooldownUntil]);

  // Items from the hook ARE the rendered list (server-filtered + sorted +
  // paginated). We mirror into local state only so feedback mutations
  // (approve/dismiss) stay optimistic without fighting the query cache.
  useEffect(() => {
    setListings(flatListings);
  }, [flatListings]);

  useEffect(() => {
    const selectedMissionStatus =
      missions.find((mission) => mission.ID === activeMissionId)?.Status?.toLowerCase() ?? '';
    const shouldStream =
      activeMissionId === 0 || selectedMissionStatus === '' || selectedMissionStatus === 'active';
    if (!shouldStream) return;
    const disconnect = connectDealStream((payload) => {
      if (!payload || typeof payload !== 'object') return;
      const event = payload as {
        type?: string;
        missionID?: number;
        deal?: { Listing?: Listing };
      };
      if (event.type !== 'deal_found' || !event.deal?.Listing?.ItemID) return;
      if (activeMissionId > 0 && Number(event.missionID || 0) !== activeMissionId) return;
      // Under server-side filters, streamed listings may not match the active
      // filter set. Keep the "New since open" hint but do NOT mutate the
      // rendered list — user can refresh to re-query with active filters.
      setNewCount((count) => count + 1);
    });
    return () => {
      disconnect();
    };
  }, [activeMissionId, missions]);

  // XOL-79: client-side outreach filter applied on top of server-side results.
  // When no outreach filter chips are selected, all listings pass through.
  const filteredListings = useMemo(() => {
    if (outreachFilters.length === 0) return listings;
    return listings.filter((l) => {
      const status: OutreachStatus = l.OutreachStatus ?? 'none';
      return outreachFilters.includes(status);
    });
  }, [listings, outreachFilters]);

  const hasActiveFilters =
    sort !== DEFAULT_MATCHES_FILTER.sort ||
    marketplace !== DEFAULT_MATCHES_FILTER.market ||
    condition !== DEFAULT_MATCHES_FILTER.condition ||
    minScore !== DEFAULT_MATCHES_FILTER.minScore ||
    outreachFilters.length > 0;
  const currentMission = missions.find((mission) => mission.ID === activeMissionId) ?? null;
  const showLegacyFeedWithoutMissions = missions.length === 0 && listings.length > 0;
  const currentMissionStatus = (currentMission?.Status || 'active').toLowerCase();
  const missionPaused = activeMissionId > 0 && currentMissionStatus === 'paused';
  const missionCompleted = activeMissionId > 0 && currentMissionStatus === 'completed';
  const hasStrictConditionOnly =
    activeMissionId > 0 &&
    (currentMission?.PreferredCondition?.length ?? 0) > 0 &&
    (currentMission?.PreferredCondition ?? []).every((c) => c === 'new' || c === 'like_new');
  const fetchErrorMessage = matchesError instanceof Error ? matchesError.message : '';
  const pageError = error || fetchErrorMessage;
  // total=0 with a filter set is the "no matches under these filters" state.
  const emptyUnderFilters =
    !isInitialLoading && !pageError && hasActiveFilters && totalMatches === 0;

  function resetFilters() {
    setSort(DEFAULT_MATCHES_FILTER.sort);
    setMarketplace(DEFAULT_MATCHES_FILTER.market);
    setCondition(DEFAULT_MATCHES_FILTER.condition);
    setMinScore(DEFAULT_MATCHES_FILTER.minScore);
    setOutreachFilters([]);
  }

  async function triggerRecheck() {
    if (!activeMissionId || recheckLoading || recheckCooldownUntil) return;
    setRecheckLoading(true);
    try {
      const res = await api.missions.recheck(activeMissionId);
      setRecheckCooldownUntil(new Date(res.next_allowed_at));
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as Error & { retryAfterSeconds?: number }).retryAfterSeconds
      ) {
        const secs = (err as Error & { retryAfterSeconds: number }).retryAfterSeconds;
        setRecheckCooldownUntil(new Date(Date.now() + secs * 1000));
      }
    } finally {
      setRecheckLoading(false);
    }
  }

  async function approveMatch(itemID: string) {
    setError('');
    // Optimistically flag as approved so the badge lights up immediately.
    const prev = listings;
    setListings((list) =>
      list.map((l) => (l.ItemID === itemID ? { ...l, Feedback: 'approved' } : l)),
    );
    try {
      await api.matches.feedback(itemID, 'approve');
    } catch (err) {
      setListings(prev);
      setError(err instanceof Error ? err.message : 'Failed to approve match');
    }
  }

  async function dismissMatch(itemID: string) {
    setError('');
    // Optimistically remove it — dismissed listings are excluded from the feed
    // server-side anyway, so we just match that here.
    const prev = listings;
    setListings((list) => list.filter((l) => l.ItemID !== itemID));
    try {
      await api.matches.feedback(itemID, 'dismiss');
    } catch (err) {
      setListings(prev);
      setError(err instanceof Error ? err.message : 'Failed to dismiss match');
    }
  }

  async function analyzeListingURL() {
    const url = analyzeURL.trim();
    if (!url || analyzeLoading) return;
    setAnalyzeLoading(true);
    setAnalyzeError('');
    setAnalyzeResult(null);
    setAnalyzeSource('');
    try {
      const res = await api.matches.analyze(url, activeMissionId);
      setAnalyzeResult(res.listing);
      setAnalyzeSource(res.reasoning_source || '');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Failed to analyze listing');
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function draftOffer(itemID: string) {
    setDraftStates((prev) => ({
      ...prev,
      [itemID]: { loading: true, text: prev[itemID]?.text ?? null },
    }));
    setError('');
    // Find the listing to get its RecommendedAction for the /draft-note verdict.
    const listing = listings.find((l) => l.ItemID === itemID);
    const verdict = (listing?.RecommendedAction as string | undefined) || 'ask_seller';
    try {
      // XOL-68: use /draft-note for rich response (questions, offer_price, lang).
      const res = await api.shortlist.draftNote(
        itemID,
        verdict,
        activeMissionId > 0 ? activeMissionId : undefined,
      );
      setDraftStates((prev) => ({
        ...prev,
        [itemID]: {
          loading: false,
          text: res.text || '',
          questions: res.questions ?? [],
          offer_price: res.offer_price,
          lang: res.lang,
        },
      }));
    } catch (err) {
      setDraftStates((prev) => ({
        ...prev,
        [itemID]: { loading: false, text: prev[itemID]?.text ?? null },
      }));
      setError(err instanceof Error ? err.message : 'Failed to draft seller message');
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <p className="section-kicker">Mission matches</p>
          <h2>Live feed scoped to your active mission</h2>
          <p className="hero-copy">
            Pick a mission to narrow deals to one buying goal. Keep mission set to All to view your
            combined feed.
          </p>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span className="metric-label">Deals found</span>
            <strong>{totalMatches}</strong>
          </div>
          <div className="stat-card">
            <span className="metric-label">Loaded</span>
            <strong>{listings.length}</strong>
          </div>
          <div className="stat-card">
            <span className="metric-label">Showing</span>
            <strong>{filteredListings.length}</strong>
          </div>
          <div className="stat-card">
            <span className="metric-label">Shortlisted</span>
            <strong>{shortlist.length}</strong>
          </div>
          <div className="stat-card live">
            <span className="metric-label">New since open</span>
            <strong>{newCount > 0 ? newCount : '—'}</strong>
          </div>
        </div>
      </section>

      {pageError && <div className="error-msg">{pageError}</div>}

      <section className="surface-panel analyze-panel">
        <div>
          <p className="section-kicker">Analyze any listing</p>
          <p className="section-support">
            Paste an OLX.bg, Marktplaats, or Vinted URL and xolto will score it with the same AI
            that ranks your mission feed.
            {activeMissionId > 0 &&
              " The active mission's goal and approved comparables will be used as context."}
          </p>
        </div>
        <div className="generator-bar">
          <input
            type="url"
            className="input"
            placeholder="https://www.olx.bg/d/ad/laptop-lenovo-thinkpad-CID632-ID1ABcDe.html"
            value={analyzeURL}
            onChange={(e) => setAnalyzeURL(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void analyzeListingURL();
            }}
            disabled={analyzeLoading}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => void analyzeListingURL()}
            disabled={analyzeLoading || !analyzeURL.trim()}
          >
            {analyzeLoading ? 'Analyzing…' : 'Run analysis'}
          </button>
        </div>
        {analyzeError && (
          <p className="error-msg" style={{ marginTop: 12 }}>
            {analyzeError}
          </p>
        )}
        {analyzeResult && (
          <div style={{ marginTop: 16 }}>
            {analyzeSource && (
              <p className="section-support" style={{ marginBottom: 8 }}>
                Reasoning source:{' '}
                <strong>{analyzeSource === 'ai' ? 'AI' : 'Heuristic fallback'}</strong>
              </p>
            )}
            <ListingCard listing={analyzeResult} />
          </div>
        )}
      </section>

      {(missionPaused || missionCompleted) && (
        <section className="surface-panel status-banner">
          <p className="section-kicker">Mission status</p>
          <p className="section-support">
            {missionPaused
              ? 'This mission is paused. Monitors are not actively hunting until you resume it.'
              : 'This mission is completed. Start or resume another mission to keep getting active matches.'}
          </p>
          <Link href="/missions" className="btn-secondary">
            Manage missions
          </Link>
        </section>
      )}

      {showLegacyFeedWithoutMissions && (
        <section className="surface-panel">
          <p className="section-kicker">Legacy feed mode</p>
          <p className="section-support">
            You have listings from older searches without mission links. Create a mission to scope
            new matches.
          </p>
          <Link href="/missions" className="btn-secondary">
            Create mission
          </Link>
        </section>
      )}

      <section className="surface-panel">
        <div className="feed-filter-group">
          <label className="feed-filter-label">Mission</label>
          <div className="generator-bar">
            <select
              className="input"
              value={activeMissionId}
              onChange={(e) => setActiveMission(Number(e.target.value))}
            >
              <option value={0}>All missions (legacy compatible)</option>
              {missions.map((mission) => (
                <option key={mission.ID} value={mission.ID}>
                  {mission.Name} ({mission.Status || 'active'})
                </option>
              ))}
            </select>
            <Link href="/missions" className="btn-secondary">
              Manage missions
            </Link>
          </div>
          {currentMission && (
            <p className="section-support">Active mission: {currentMission.Name}</p>
          )}
          {activeMissionId > 0 && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void triggerRecheck()}
                disabled={recheckLoading || !!recheckCooldownUntil}
              >
                {recheckLoading
                  ? 'Checking…'
                  : recheckCooldownUntil
                    ? `Next check in ${recheckCooldownDisplay}`
                    : 'Check again now'}
              </button>
            </div>
          )}
        </div>
      </section>

      {(listings.length > 0 || hasActiveFilters) && (
        <div className="feed-filter-bar">
          <div className="feed-filter-group">
            <label className="feed-filter-label">Sort</label>
            <div className="feed-pill-group">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`feed-pill${sort === key ? ' active' : ''}`}
                  onClick={() => setSort(key)}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="feed-filter-group">
            <label className="feed-filter-label">Market</label>
            <div className="feed-pill-group">
              {(Object.keys(MARKETPLACE_LABELS) as MarketplaceFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`feed-pill${marketplace === key ? ' active' : ''}`}
                  onClick={() => setMarketplace(key)}
                >
                  {MARKETPLACE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="feed-filter-row">
            <div className="feed-filter-group">
              <label className="feed-filter-label">Condition</label>
              <div className="feed-pill-group">
                {(Object.keys(CONDITION_LABELS) as ConditionFilter[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`feed-pill${condition === key ? ' active' : ''}`}
                    onClick={() => setCondition(key)}
                  >
                    {CONDITION_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="feed-filter-group">
              <label className="feed-filter-label">Min score</label>
              <div className="feed-pill-group">
                {MIN_SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`feed-pill${minScore === opt.value ? ' active' : ''}`}
                    onClick={() => setMinScore(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* XOL-79: outreach status filter — client-side multi-select */}
            <div className="feed-filter-group">
              <label className="feed-filter-label">Outreach</label>
              <div className="feed-pill-group">
                {OUTREACH_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`filter-outreach-${opt.value}`}
                    className={`feed-pill${outreachFilters.includes(opt.value) ? ' active' : ''}`}
                    onClick={() =>
                      setOutreachFilters((prev) =>
                        prev.includes(opt.value)
                          ? prev.filter((s) => s !== opt.value)
                          : [...prev, opt.value],
                      )
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button type="button" className="feed-reset-btn" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {isInitialLoading ? (
        <div className="surface-panel empty-state">
          <h3>Loading matches…</h3>
          <p>Fetching the latest deals for this mission.</p>
        </div>
      ) : emptyUnderFilters ? (
        <div className="surface-panel empty-state">
          <h3>No matches under these filters</h3>
          <p>Try relaxing score threshold, condition, or market constraints.</p>
          <button type="button" className="btn-ghost" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      ) : missions.length === 0 && listings.length === 0 ? (
        <div className="surface-panel empty-state">
          <h3>No missions yet</h3>
          <p>Create a mission first to scope and prioritize your matches.</p>
          <Link href="/missions" className="btn-primary">
            Start a mission
          </Link>
        </div>
      ) : listings.length === 0 && (missionPaused || missionCompleted) && !error ? (
        <div className="surface-panel empty-state">
          <h3>{missionPaused ? 'Mission is paused' : 'Mission is completed'}</h3>
          <p>
            {missionPaused
              ? 'Resume this mission to start collecting fresh matches again.'
              : 'Reactivate this mission or switch to an active mission to keep monitoring the market.'}
          </p>
        </div>
      ) : listings.length === 0 && !error ? (
        <div className="surface-panel empty-state">
          <h3>No matches yet for this mission</h3>
          {hasStrictConditionOnly ? (
            <>
              <p>
                Listings exist on OLX.bg but none match your <strong>New / Like new</strong>{' '}
                condition preference. Try relaxing the condition filter to include{' '}
                <strong>Good</strong> or <strong>Fair</strong> listings.
              </p>
              <Link href="/missions" className="btn-secondary">
                Edit mission
              </Link>
            </>
          ) : (
            <p>Keep monitors running or broaden budget/condition constraints in your mission.</p>
          )}
        </div>
      ) : (
        <>
          <div className="listing-stack">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.ItemID}
                listing={listing}
                isSaved={isShortlisted(listing.ItemID)}
                onShortlist={addToShortlist}
                onDraftOffer={draftOffer}
                onApprove={activeMissionId > 0 ? approveMatch : undefined}
                onDismiss={activeMissionId > 0 ? dismissMatch : undefined}
                draftState={draftStates[listing.ItemID]}
                missionId={activeMissionId > 0 ? activeMissionId : undefined}
              />
            ))}
          </div>
          <p className="pagination-status" aria-live="polite">
            Showing {filteredListings.length} of {totalMatches}
          </p>
          {hasNextPage && (
            <button
              type="button"
              className="load-more-btn"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more matches'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
