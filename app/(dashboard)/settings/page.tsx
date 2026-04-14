"use client";

import { useEffect, useState } from "react";

import { useDashboardContext } from "../../../components/DashboardContext";
import { api, SUPPORTED_COUNTRIES } from "../../../lib/api";

const TIER_LABELS: Record<string, string> = { free: "Free", pro: "Pro", power: "Power" };

export default function SettingsPage() {
  const { user, refreshUser, setUser } = useDashboardContext();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("NL");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setCountryCode(user.country_code || "NL");
    setRegion(user.region || "");
    setCity(user.city || "");
    setPostalCode(user.postal_code || "");
    setRadiusKm(user.preferred_radius_km || 50);
    setCrossBorderEnabled(Boolean(user.cross_border_enabled));
  }, [user]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!countryCode) {
      setError("Country is required.");
      return;
    }
    setError("");
    setNotice("");
    setSavingProfile(true);
    try {
      const updated = await api.users.update({
        name: name.trim() || user?.name,
        country_code: countryCode,
        region: region.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        preferred_radius_km: Math.max(1, Math.round(radiusKm || 0)),
        cross_border_enabled: crossBorderEnabled,
      });
      setUser(updated);
      await refreshUser();
      setNotice("Location defaults updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCheckout(priceID: string) {
    if (!priceID) {
      setError("Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PRO_PRICE_ID / NEXT_PUBLIC_STRIPE_POWER_PRICE_ID in .env.local.");
      return;
    }

    try {
      const res = await api.billing.createCheckout(priceID);
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  async function openBillingPortal() {
    try {
      const res = await api.billing.portal();
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel compact">
        <div>
          <p className="section-kicker">Settings</p>
          <h2>Account, location defaults, and billing</h2>
          <p className="hero-copy">Set where xolto should search by default, review how you sign in, and manage plan changes.</p>
        </div>
        <div className="stat-card">
          <span className="metric-label">Current plan</span>
          <strong>{TIER_LABELS[user.tier] ?? user.tier}</strong>
        </div>
      </section>

      {error && <div className="error-msg">{error}</div>}
      {notice && <div className="notice-msg">{notice}</div>}

      <div className="settings-grid">
        <section className="surface-panel">
          <div className="profile-card">
            <div className="profile-avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="section-kicker">Profile</p>
              <h3>{user.name || "Unnamed account"}</h3>
              <p className="section-support">{user.email}</p>
            </div>
          </div>

          <div className="settings-list">
            <div className="settings-row">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="settings-row">
              <span>Plan</span>
              <strong>{TIER_LABELS[user.tier] ?? user.tier}</strong>
            </div>
            <div className="settings-row">
              <span>Sign-in methods</span>
              <strong>{(user.auth_methods || ["password"]).join(", ")}</strong>
            </div>
          </div>
        </section>

        <section className="surface-panel">
          <p className="section-kicker">Location defaults</p>
          <h3>Decide where missions should search by default</h3>
          <p className="section-support">These values prefill new missions and keep the marketplace scope local unless you opt into cross-border search.</p>

          <form className="settings-form" onSubmit={saveProfile}>
            <div className="location-grid">
              <div className="input-stack">
                <label className="label" htmlFor="settings-name">
                  Name
                </label>
                <input id="settings-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div className="input-stack">
                <label className="label" htmlFor="settings-country">
                  Country
                </label>
                <select id="settings-country" className="input" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-stack">
                <label className="label" htmlFor="settings-city">
                  City
                </label>
                <input id="settings-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Amsterdam" />
              </div>

              <div className="input-stack">
                <label className="label" htmlFor="settings-region">
                  Region
                </label>
                <input id="settings-region" className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="North Holland" />
              </div>

              <div className="input-stack">
                <label className="label" htmlFor="settings-postal">
                  Postal code
                </label>
                <input id="settings-postal" className="input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1012 AB" />
              </div>

              <div className="input-stack">
                <label className="label" htmlFor="settings-radius">
                  Search radius (km)
                </label>
                <input
                  id="settings-radius"
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
              <span>Allow future missions to include nearby countries when supported</span>
            </label>

            <div className="hero-actions">
              <button type="submit" className="btn-primary" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save location defaults"}
              </button>
            </div>
          </form>
        </section>

        {user.tier === "free" ? (
          <section className="surface-panel premium-card">
            <p className="section-kicker">Upgrade</p>
            <h3>Unlock faster scans and more active hunts</h3>
            <p className="section-support">Choose the plan that fits how aggressively you want xolto to monitor the market.</p>

            <div className="plan-grid">
              <PlanCard
                name="Pro"
                price="€9"
                features={["10 active missions", "2 marketplaces per mission", "5 minute polling", "Google + email sign-in"]}
                onUpgrade={() => void handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "")}
              />
              <PlanCard
                name="Power"
                price="€29"
                highlight
                features={["Unlimited missions", "5 marketplaces per mission", "1 minute polling", "First-priority alerts"]}
                onUpgrade={() => void handleCheckout(process.env.NEXT_PUBLIC_STRIPE_POWER_PRICE_ID ?? "")}
              />
            </div>
          </section>
        ) : (
          <section className="surface-panel">
            <p className="section-kicker">Billing</p>
            <h3>Manage your paid workspace</h3>
            <p className="section-support">Open Stripe’s billing portal to update payment details, invoices, and subscription settings.</p>
            <button type="button" className="btn-primary" onClick={() => void openBillingPortal()}>
              Open billing portal
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  highlight = false,
  onUpgrade,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  onUpgrade: () => void;
}) {
  return (
    <article className={`plan-card${highlight ? " highlight" : ""}`}>
      {highlight && <span className="success-badge">Most popular</span>}
      <h4>{name}</h4>
      <p className="plan-price">
        {price}
        <span>/month</span>
      </p>
      <ul className="plan-feature-list">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button type="button" className={highlight ? "btn-primary" : "btn-secondary"} onClick={onUpgrade}>
        Upgrade to {name}
      </button>
    </article>
  );
}
