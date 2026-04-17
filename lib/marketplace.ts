// Marketplace → country / locale wiring. Kept in its own module (no React,
// no `fetch`, no cross-file imports) so it can be pulled by pure presenters
// that run under the Node `--test` harness without dragging the whole
// lib/api.ts surface along.

export type MarketplaceOption = {
  id: string;
  label: string;
  countryCode: string;
  providerFamily: string;
};

export const SUPPORTED_COUNTRIES = [
  { code: 'NL', label: 'Netherlands' },
  { code: 'BG', label: 'Bulgaria' },
  { code: 'DK', label: 'Denmark' },
] as const;

export const MARKETPLACE_OPTIONS: MarketplaceOption[] = [
  { id: 'marktplaats', label: 'Marktplaats', countryCode: 'NL', providerFamily: 'marktplaats' },
  { id: 'vinted_nl', label: 'Vinted NL', countryCode: 'NL', providerFamily: 'vinted' },
  { id: 'olxbg', label: 'OLX BG', countryCode: 'BG', providerFamily: 'olx' },
  { id: 'vinted_dk', label: 'Vinted DK', countryCode: 'DK', providerFamily: 'vinted' },
];

// marketplaceCountryCode returns the ISO country code for a marketplace id,
// or null when the id is unknown / missing. Downstream presenters
// (comparables chip copy, price locale) read from this one map so there is
// a single source of truth to extend when we add markets.
export function marketplaceCountryCode(marketplaceId?: string | null): string | null {
  if (!marketplaceId) return null;
  const match = MARKETPLACE_OPTIONS.find((m) => m.id === marketplaceId);
  return match ? match.countryCode : null;
}

export function marketplaceCandidates(
  countryCode?: string,
  crossBorder = false,
): MarketplaceOption[] {
  if (crossBorder) return MARKETPLACE_OPTIONS;
  return MARKETPLACE_OPTIONS.filter(
    (marketplace) => marketplace.countryCode === (countryCode || '').toUpperCase(),
  );
}
