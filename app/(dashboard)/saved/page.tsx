'use client';

import { useMemo, useState } from 'react';

import { useDashboardContext } from '../../../components/DashboardContext';
import { ShortlistTable } from '../../../components/ShortlistTable';
import { api, ShortlistEntry } from '../../../lib/api';
import { formatEuroFromCents } from '../../../lib/format';

// Maps shortlist RecommendationLabel → /draft-note verdict parameter.
function labelToVerdict(label: string): string {
  switch (label) {
    case 'buy_now':
      return 'buy';
    case 'worth_watching':
      return 'negotiate';
    case 'ask_questions':
      return 'ask_seller';
    case 'skip':
      return 'skip';
    default:
      return 'ask_seller';
  }
}

// ShortlistEntry does not carry MustHaves — always return em-dash.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mustHaveSummary(_entry: ShortlistEntry): string {
  return '—';
}

export default function SavedPage() {
  const { shortlist, removeFromShortlist } = useDashboardContext();
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
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const prioritizedShortlist = useMemo(() => {
    return [...shortlist].sort((a, b) => {
      const aStrong =
        a.RecommendationLabel === 'buy_now' || a.Verdict.toLowerCase().includes('strong buy');
      const bStrong =
        b.RecommendationLabel === 'buy_now' || b.Verdict.toLowerCase().includes('strong buy');
      if (aStrong === bStrong) return 0;
      return aStrong ? -1 : 1;
    });
  }, [shortlist]);

  const totalOpportunity = prioritizedShortlist.reduce((sum, item) => {
    const savings = item.FairPrice > 0 && item.AskPrice > 0 ? item.FairPrice - item.AskPrice : 0;
    return sum + Math.max(0, savings);
  }, 0);

  const buyNowCount = prioritizedShortlist.filter(
    (item) =>
      item.RecommendationLabel === 'buy_now' || item.Verdict.toLowerCase().includes('strong buy'),
  ).length;

  async function draftOffer(itemID: string) {
    setDraftStates((prev) => ({
      ...prev,
      [itemID]: { loading: true, text: prev[itemID]?.text ?? null },
    }));
    setError('');
    // Find the item to get its verdict label.
    const item = prioritizedShortlist.find((s) => s.ItemID === itemID);
    const verdict = item ? labelToVerdict(item.RecommendationLabel) : 'ask_seller';
    try {
      // XOL-68: use /draft-note for rich response (questions, offer_price, lang).
      const res = await api.shortlist.draftNote(itemID, verdict);
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
      setError(err instanceof Error ? err.message : 'Failed to draft message');
    }
  }

  function toggleSelect(itemID: string) {
    setSelectedIDs((prev) => {
      if (prev.includes(itemID)) return prev.filter((id) => id !== itemID);
      if (prev.length >= 4) return prev;
      return [...prev, itemID];
    });
  }

  const selectedListings = useMemo(
    () => prioritizedShortlist.filter((item) => selectedIDs.includes(item.ItemID)),
    [prioritizedShortlist, selectedIDs],
  );

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <p className="section-kicker">Saved comparisons</p>
          <h2>Compare top candidates before messaging sellers</h2>
          <p className="hero-copy">
            Switch between card view and side-by-side comparison mode. Select up to 4 listings for
            direct evaluation.
          </p>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span className="metric-label">Saved deals</span>
            <strong>{prioritizedShortlist.length}</strong>
          </div>
          {buyNowCount > 0 && (
            <div className="stat-card live">
              <span className="metric-label">Buy now</span>
              <strong>{buyNowCount}</strong>
            </div>
          )}
          {totalOpportunity > 0 && (
            <div className="stat-card">
              <span className="metric-label">Total opportunity</span>
              <strong>{formatEuroFromCents(totalOpportunity)}</strong>
            </div>
          )}
          <button
            type="button"
            data-testid="compare-toggle"
            className={`compare-toggle-btn${comparisonMode ? ' active' : ''}`}
            onClick={() => {
              setComparisonMode((v) => !v);
              setSelectedIDs([]);
              setShowPanel(false);
            }}
          >
            {comparisonMode ? 'Cancel compare' : 'Compare'}
          </button>
        </div>
      </section>

      {error && <div className="error-msg">{error}</div>}

      {comparisonMode && selectedIDs.length >= 2 && (
        <div className="compare-action-bar" data-testid="compare-action-bar">
          <span>{selectedIDs.length} selected</span>
          <button
            type="button"
            onClick={() => setShowPanel(true)}
            disabled={selectedIDs.length < 2}
          >
            Compare selected ({selectedIDs.length})
          </button>
        </div>
      )}

      {showPanel && (
        <div className="compare-panel" data-testid="compare-panel">
          <button type="button" className="compare-panel-close" onClick={() => setShowPanel(false)}>
            ✕ Close
          </button>
          <div className="compare-table-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  {selectedListings.map((l) => (
                    <th key={l.ItemID} data-testid={`compare-cell-${l.ItemID}`}>
                      {l.Title?.slice(0, 40)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Price</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{formatEuroFromCents(l.AskPrice)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Fair price</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{formatEuroFromCents(l.FairPrice)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Score</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>
                      {l.RecommendationScore > 0 ? l.RecommendationScore.toFixed(1) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Verdict</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{l.Verdict || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>Condition</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{l.Condition || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td>Must-haves</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{mustHaveSummary(l)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Outreach</td>
                  {selectedListings.map((l) => (
                    <td key={l.ItemID}>{l.OutreachStatus || 'none'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ShortlistTable
        items={prioritizedShortlist}
        draftStates={draftStates}
        onDraftOffer={draftOffer}
        comparisonMode={comparisonMode}
        selectedIDs={selectedIDs}
        onToggleSelect={toggleSelect}
        onRemove={async (itemID) => {
          try {
            await removeFromShortlist(itemID);
            setSelectedIDs((prev) => prev.filter((id) => id !== itemID));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove item');
          }
        }}
      />
    </div>
  );
}
