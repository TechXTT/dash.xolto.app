'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

type GlobalErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="fullscreen-shell landing-loading">
        <div style={{ maxWidth: 540, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>A critical error occurred.</h2>
          <p className="loading-copy" style={{ marginBottom: 20 }}>
            We logged this issue to monitoring. Try recovering the app.
          </p>
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
