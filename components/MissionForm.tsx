'use client';

import { useEffect, useMemo, useState } from 'react';

import { useDashboardContext } from './DashboardContext';
import { api, marketplaceCandidates, Mission, SUPPORTED_COUNTRIES } from '../lib/api';

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  phone: ['128GB+', 'battery health 85%+', 'factory unlocked'],
  laptop: ['16GB RAM+', 'battery cycle count', 'no dead pixels'],
  camera: ['low shutter count', 'sensor clean', 'original charger'],
  other: [],
};

const CONDITIONS = ['new', 'like_new', 'good', 'fair'];

function maxMarketplacesForTier(tier?: string) {
  switch ((tier || '').toLowerCase()) {
    case 'power':
      return 5;
    case 'pro':
      return 2;
    default:
      return 1;
  }
}

export function MissionForm({
  initialMission,
  onSaved,
  onCancel,
}: {
  initialMission?: Mission | null;
  onSaved?: (mission: Mission) => void;
  onCancel?: () => void;
}) {
  const { user } = useDashboardContext();
  const [name, setName] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [category, setCategory] = useState<'phone' | 'laptop' | 'camera' | 'other'>('phone');
  const [budgetMax, setBudgetMax] = useState(900);
  const [conditions, setConditions] = useState<string[]>(['like_new', 'good']);
  const [mustHaveInput, setMustHaveInput] = useState('');
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState('BG');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [travelRadius, setTravelRadius] = useState(50);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(false);
  const [marketplaceScope, setMarketplaceScope] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const maxMarketplaces = maxMarketplacesForTier(user?.tier);
  const availableMarketplaces = useMemo(
    () => marketplaceCandidates(countryCode, crossBorderEnabled),
    [countryCode, crossBorderEnabled],
  );

  useEffect(() => {
    const nextCountry = initialMission?.CountryCode || user?.country_code || 'BG';
    const nextCrossBorder = Boolean(
      initialMission?.CrossBorderEnabled ?? user?.cross_border_enabled,
    );
    const defaults = marketplaceCandidates(nextCountry, nextCrossBorder).map(
      (marketplace) => marketplace.id,
    );

    setName(initialMission?.Name || '');
    setTargetQuery(initialMission?.TargetQuery || initialMission?.Name || '');
    setCategory((initialMission?.Category as 'phone' | 'laptop' | 'camera' | 'other') || 'phone');
    setBudgetMax(initialMission?.BudgetMax || 900);
    setConditions(
      initialMission?.PreferredCondition?.length
        ? initialMission.PreferredCondition
        : ['like_new', 'good'],
    );
    setMustHaves(initialMission?.RequiredFeatures || []);
    setCountryCode(nextCountry);
    setRegion(initialMission?.Region || user?.region || '');
    setCity(initialMission?.City || user?.city || '');
    setPostalCode(initialMission?.PostalCode || user?.postal_code || '');
    setTravelRadius(initialMission?.TravelRadius || user?.preferred_radius_km || 50);
    setCrossBorderEnabled(nextCrossBorder);
    setMarketplaceScope(
      (initialMission?.MarketplaceScope?.length ? initialMission.MarketplaceScope : defaults).slice(
        0,
        maxMarketplaces,
      ),
    );
  }, [initialMission, user, maxMarketplaces]);

  useEffect(() => {
    const availableIDs = new Set(availableMarketplaces.map((marketplace) => marketplace.id));
    const defaults = availableMarketplaces
      .map((marketplace) => marketplace.id)
      .slice(0, maxMarketplaces);
    setMarketplaceScope((current) => {
      const filtered = current
        .filter((marketplaceID) => availableIDs.has(marketplaceID))
        .slice(0, maxMarketplaces);
      return filtered.length > 0 ? filtered : defaults;
    });
  }, [availableMarketplaces, maxMarketplaces]);

  function toggleCondition(value: string) {
    setConditions((prev) => {
      if (prev.includes(value)) return prev.filter((entry) => entry !== value);
      return [...prev, value];
    });
  }

  function addMustHave(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setMustHaves((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setMustHaveInput('');
  }

  function toggleMarketplace(marketplaceID: string) {
    setError('');
    setMarketplaceScope((current) => {
      if (current.includes(marketplaceID)) {
        return current.filter((entry) => entry !== marketplaceID);
      }
      if (current.length >= maxMarketplaces) {
        setError(
          `Your ${user?.tier || 'free'} plan supports up to ${maxMarketplaces} marketplace${maxMarketplaces === 1 ? '' : 's'} per mission.`,
        );
        return current;
      }
      return [...current, marketplaceID];
    });
  }

  async function submit() {
    if (!name.trim()) {
      setError('Give the mission a clear name first.');
      return;
    }
    if (!countryCode) {
      setError('Choose the mission country first.');
      return;
    }
    if (marketplaceScope.length === 0) {
      setError('Pick at least one marketplace for this mission.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const normalizedQuery = (targetQuery.trim() || name.trim()).toLowerCase();
      const payload: Partial<Mission> = {
        Name: name.trim(),
        TargetQuery: normalizedQuery,
        BudgetMax: budgetMax,
        BudgetStretch: Math.round(budgetMax * 1.1),
        PreferredCondition: conditions,
        RequiredFeatures: mustHaves,
        SearchQueries: Array.from(
          new Set(
            [
              normalizedQuery,
              name.trim().toLowerCase(),
              ...mustHaves.map((value) => value.toLowerCase()),
            ].filter(Boolean),
          ),
        ),
        Status: initialMission?.Status || 'active',
        Urgency: initialMission?.Urgency || 'flexible',
        Category: category,
        CountryCode: countryCode,
        Region: region.trim(),
        City: city.trim(),
        PostalCode: postalCode.trim(),
        TravelRadius: Math.max(1, Math.round(travelRadius || 0)),
        CrossBorderEnabled: crossBorderEnabled,
        MarketplaceScope: marketplaceScope,
      };
      const mission = initialMission?.ID
        ? await api.missions.update(initialMission.ID, payload)
        : await api.missions.create(payload);
      onSaved?.(mission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">
            {initialMission?.ID ? 'Edit mission' : 'Structured mission'}
          </p>
          <h3>
            {initialMission?.ID
              ? 'Update the mission scope and search brief'
              : 'Tell xolto exactly what to hunt'}
          </h3>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="location-grid">
        <div className="input-stack">
          <label className="label" htmlFor="mission-name">
            Mission name
          </label>
          <input
            id="mission-name"
            className="input"
            placeholder="Sony A6700 travel kit"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="input-stack">
          <label className="label" htmlFor="mission-query">
            Search query
          </label>
          <input
            id="mission-query"
            className="input"
            placeholder="sony a6700"
            value={targetQuery}
            onChange={(e) => setTargetQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="feed-pill-group" style={{ marginBottom: 14 }}>
        {(['phone', 'laptop', 'camera', 'other'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`feed-pill${category === value ? ' active' : ''}`}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="feed-filter-label">Budget (EUR): {budgetMax}</label>
        <input
          type="range"
          min={100}
          max={4000}
          step={25}
          value={budgetMax}
          onChange={(e) => setBudgetMax(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div className="feed-filter-group" style={{ marginTop: 14 }}>
        <label className="feed-filter-label">Condition</label>
        <div className="feed-pill-group">
          {CONDITIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`feed-pill${conditions.includes(value) ? ' active' : ''}`}
              onClick={() => toggleCondition(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="feed-filter-group" style={{ marginTop: 14 }}>
        <label className="feed-filter-label">Must-haves</label>
        <div className="generator-bar">
          <input
            className="input"
            placeholder="Type a must-have and press Enter"
            value={mustHaveInput}
            onChange={(e) => setMustHaveInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMustHave(mustHaveInput);
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => addMustHave(mustHaveInput)}
          >
            Add
          </button>
        </div>
        <div className="feed-pill-group" style={{ marginTop: 10 }}>
          {CATEGORY_SUGGESTIONS[category].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="feed-pill"
              onClick={() => addMustHave(suggestion)}
            >
              + {suggestion}
            </button>
          ))}
          {mustHaves.map((value) => (
            <button
              key={value}
              type="button"
              className="feed-pill active"
              onClick={() => setMustHaves((prev) => prev.filter((entry) => entry !== value))}
            >
              {value} ×
            </button>
          ))}
        </div>
      </div>

      <div className="feed-filter-group" style={{ marginTop: 18 }}>
        <label className="feed-filter-label">Location</label>
      </div>

      <div className="location-grid">
        <div className="input-stack">
          <label className="label" htmlFor="mission-country">
            Country
          </label>
          <select
            id="mission-country"
            className="input"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {SUPPORTED_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-stack">
          <label className="label" htmlFor="mission-radius">
            Travel radius (km)
          </label>
          <input
            id="mission-radius"
            type="number"
            min={1}
            max={500}
            className="input"
            value={travelRadius}
            onChange={(e) => setTravelRadius(Number(e.target.value) || 1)}
          />
        </div>

        <div className="input-stack">
          <label className="label" htmlFor="mission-city">
            City
          </label>
          <input
            id="mission-city"
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Amsterdam"
          />
        </div>

        <div className="input-stack">
          <label className="label" htmlFor="mission-region">
            Region
          </label>
          <input
            id="mission-region"
            className="input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="North Holland"
          />
        </div>

        <div className="input-stack">
          <label className="label" htmlFor="mission-postal">
            Postal code
          </label>
          <input
            id="mission-postal"
            className="input"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="1012 AB"
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={crossBorderEnabled}
          onChange={(e) => setCrossBorderEnabled(e.target.checked)}
        />
        <span>Search nearby countries too when supported</span>
      </label>

      <div className="feed-filter-group" style={{ marginTop: 18 }}>
        <label className="feed-filter-label">Marketplaces</label>
        <div className="feed-pill-group">
          {availableMarketplaces.map((marketplace) => (
            <button
              key={marketplace.id}
              type="button"
              className={`feed-pill${marketplaceScope.includes(marketplace.id) ? ' active' : ''}`}
              onClick={() => toggleMarketplace(marketplace.id)}
            >
              {marketplace.label}
            </button>
          ))}
        </div>
      </div>
      <p className="section-support">
        {user?.tier ? `${user.tier.toUpperCase()} plan:` : 'Current plan:'} up to {maxMarketplaces}{' '}
        marketplace{maxMarketplaces === 1 ? '' : 's'} per mission.
      </p>

      <div className="hero-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void submit()}
          disabled={loading}
        >
          {loading ? 'Saving…' : initialMission?.ID ? 'Save mission' : 'Start mission'}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
