'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="fullscreen-shell landing-loading">
      <div style={{ maxWidth: 540, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Something went wrong.</h2>
        <p className="loading-copy" style={{ marginBottom: 20 }}>
          We logged this error to monitoring. Try again or refresh the page.
        </p>
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
