// Pure presenter for the backend-emitted CurrencyStatus field (XOL-61,
// TRUST-1). Kept in its own module with zero React / fetch / cross-file
// imports so it can be unit-tested under `node --test` with native TS.
//
// Wire values (see lib/api.ts Listing.CurrencyStatus):
//   "eur_native"         — listing was scraped in EUR; no conversion
//   "converted_from_bgn" — OLX BG listing converted BGN → EUR at ingest
//   "unknown"            — backend couldn't determine
//   ""                   — field absent on pre-M2 rows or non-OLX markets
//
// `currencyStatusMeta` returns `null` for empty/undefined so the caller
// renders nothing (no visual noise on legacy rows).

export type CurrencyStatusVariant = 'eur-native' | 'converted' | 'unknown';

export type CurrencyStatusMeta = {
  label: string;
  testid: string;
  variant: CurrencyStatusVariant;
  ariaLabel: string;
};

export type CurrencyStatus =
  | 'eur_native'
  | 'converted_from_bgn'
  | 'unknown'
  | ''
  | undefined
  | null;

export function currencyStatusMeta(status: CurrencyStatus): CurrencyStatusMeta | null {
  switch (status) {
    case 'eur_native':
      return {
        label: 'EUR в обявата',
        testid: 'currency-status-badge-eur-native',
        variant: 'eur-native',
        ariaLabel: 'Цената е обявена в EUR на OLX.bg и не е конвертирана.',
      };
    case 'converted_from_bgn':
      return {
        label: '≈ от лв (BGN)',
        testid: 'currency-status-badge-converted',
        variant: 'converted',
        ariaLabel: 'Обявата е на лв — xolto преизчислява към EUR при 1.95583.',
      };
    case 'unknown':
      return {
        label: 'Валута неясна',
        testid: 'currency-status-badge-unknown',
        variant: 'unknown',
        ariaLabel: 'OLX не върна валута за тази обява; третираме като BGN.',
      };
    default:
      return null;
  }
}
