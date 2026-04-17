import type { SearchSpec } from './api';
import { marketplaceCountryCode } from './marketplace';

// Locale is chosen from the listing's marketplace country so that grouping
// separators and decimal style match local reading habits. Currency stays
// EUR everywhere because the dash displays EUR regardless of the source
// marketplace (EUR cents is the internal storage unit; OLX BG ingest
// converts BGN -> EUR upstream).
//
//   NL markets (marktplaats, vinted_nl) -> "nl-NL"
//   BG market  (olxbg)                  -> "bg-BG"
//   unknown / missing                   -> "en-US" (neutral fallback)
//
// Formatters are cached per locale so we don't rebuild Intl instances on
// every render.

const FALLBACK_LOCALE = 'en-US';

function localeForCountry(countryCode: string | null): string {
  switch (countryCode) {
    case 'NL':
      return 'nl-NL';
    case 'BG':
      return 'bg-BG';
    default:
      return FALLBACK_LOCALE;
  }
}

function localeForMarketplace(marketplaceId?: string | null): string {
  return localeForCountry(marketplaceCountryCode(marketplaceId));
}

const euroFormatterCache = new Map<string, Intl.NumberFormat>();

function getEuroFormatter(locale: string): Intl.NumberFormat {
  const cached = euroFormatterCache.get(locale);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  euroFormatterCache.set(locale, fmt);
  return fmt;
}

export function formatEuroFromCents(
  cents: number,
  fallback = '—',
  marketplaceId?: string | null,
): string {
  if (!Number.isFinite(cents) || cents <= 0) return fallback;
  return getEuroFormatter(localeForMarketplace(marketplaceId)).format(cents / 100);
}

export function formatCompactEuroFromCents(
  cents: number,
  fallback = '—',
  marketplaceId?: string | null,
): string {
  if (!Number.isFinite(cents) || cents <= 0) return fallback;
  return getEuroFormatter(localeForMarketplace(marketplaceId)).format(Math.round(cents / 100));
}

export function normalizeCheckIntervalMinutes(input?: number | string): number {
  if (typeof input === 'string') {
    const numeric = Number(input);
    if (Number.isFinite(numeric)) return normalizeCheckIntervalMinutes(numeric);
    return 5;
  }
  if (!Number.isFinite(input) || !input || input <= 0) return 5;
  if (input > 1_000_000) {
    return Math.max(1, Math.round(input / 1_000_000_000 / 60));
  }
  if (input > 60) {
    return Math.max(1, Math.round(input / 60));
  }
  return Math.max(1, Math.round(input));
}

export function intervalMinutesToDurationNs(minutes: number): number {
  return Math.max(1, Math.round(minutes)) * 60 * 1_000_000_000;
}

export function searchSignature(
  spec: Pick<SearchSpec, 'MarketplaceID' | 'Query' | 'CategoryID' | 'MaxPrice'>,
): string {
  return [
    (spec.MarketplaceID || '').trim().toLowerCase(),
    (spec.Query || '').trim().toLowerCase(),
    spec.CategoryID || 0,
    spec.MaxPrice || 0,
  ].join('|');
}
