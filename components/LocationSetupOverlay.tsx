'use client';

import { useEffect, useState } from 'react';

import { api, SUPPORTED_COUNTRIES, User } from '../lib/api';

export function LocationSetupOverlay({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (user: User) => void;
}) {
  const [name, setName] = useState(user.name || '');
  const [countryCode, setCountryCode] = useState(user.country_code || 'NL');
  const [region, setRegion] = useState(user.region || '');
  const [city, setCity] = useState(user.city || '');
  const [postalCode, setPostalCode] = useState(user.postal_code || '');
  const [radiusKm, setRadiusKm] = useState(user.preferred_radius_km || 50);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(Boolean(user.cross_border_enabled));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name || '');
    setCountryCode(user.country_code || 'NL');
    setRegion(user.region || '');
    setCity(user.city || '');
    setPostalCode(user.postal_code || '');
    setRadiusKm(user.preferred_radius_km || 50);
    setCrossBorderEnabled(Boolean(user.cross_border_enabled));
  }, [user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!countryCode) {
      setError('Choose the country where xolto should start searching.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const updated = await api.users.update({
        name: name.trim() || user.name,
        country_code: countryCode,
        region: region.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        preferred_radius_km: Math.max(1, Math.round(radiusKm || 0)),
        cross_border_enabled: crossBorderEnabled,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your location defaults');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-backdrop">
      <form className="onboarding-card location-setup-card" onSubmit={handleSubmit}>
        <div className="onboarding-icon">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </div>

        <p className="section-kicker">Location required</p>
        <h2 className="onboarding-title">Where should xolto hunt first?</h2>
        <p className="onboarding-body">
          Your default location decides which marketplaces become eligible for missions and keeps
          crawling focused on the places you can actually buy from.
        </p>

        {error && <div className="error-msg">{error}</div>}

        <div className="location-grid">
          <div className="input-stack">
            <label className="label" htmlFor="location-name">
              Name
            </label>
            <input
              id="location-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="input-stack">
            <label className="label" htmlFor="location-country">
              Country
            </label>
            <select
              id="location-country"
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
            <label className="label" htmlFor="location-city">
              City
            </label>
            <input
              id="location-city"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Amsterdam"
            />
          </div>

          <div className="input-stack">
            <label className="label" htmlFor="location-region">
              Region
            </label>
            <input
              id="location-region"
              className="input"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="North Holland"
            />
          </div>

          <div className="input-stack">
            <label className="label" htmlFor="location-postal">
              Postal code
            </label>
            <input
              id="location-postal"
              className="input"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1012 AB"
            />
          </div>

          <div className="input-stack">
            <label className="label" htmlFor="location-radius">
              Search radius (km)
            </label>
            <input
              id="location-radius"
              type="number"
              min={1}
              max={500}
              className="input"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={crossBorderEnabled}
            onChange={(e) => setCrossBorderEnabled(e.target.checked)}
          />
          <span>Allow missions to include nearby countries when supported</span>
        </label>

        <div className="onboarding-actions">
          <p className="section-support location-setup-support">
            You can refine this later in Settings and override it per mission.
          </p>
          <div className="onboarding-spacer" />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save location'}
          </button>
        </div>
      </form>
    </div>
  );
}
