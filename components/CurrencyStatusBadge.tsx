import { currencyStatusMeta, type CurrencyStatus } from '../lib/currencyStatus';

interface Props {
  status: CurrencyStatus;
}

export function CurrencyStatusBadge({ status }: Props) {
  const meta = currencyStatusMeta(status);
  if (!meta) return null;
  return (
    <span
      className="evidence-chip currency-status-badge"
      data-testid={meta.testid}
      data-currency-status={meta.variant}
      aria-label={meta.ariaLabel}
      title={meta.ariaLabel}
    >
      {meta.label}
    </span>
  );
}
