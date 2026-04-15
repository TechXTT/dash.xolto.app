'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';

class SentryExampleFrontendError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = 'SentryExampleFrontendError';
  }
}

export default function Page() {
  const [hasSentError, setHasSentError] = useState(false);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 48,
        fontFamily: 'system-ui, sans-serif',
        color: '#f0f0f0',
        background: '#05100d',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>sentry-example-page</h1>
      <p style={{ opacity: 0.8, maxWidth: 560, marginBottom: 24 }}>
        Click to trigger a frontend error and a backend error via the API route. Both should appear
        in Sentry within ~30s with source-mapped stack traces.
      </p>
      <button
        type="button"
        onClick={async () => {
          await Sentry.startSpan(
            { name: 'Example Frontend/Backend Span', op: 'test' },
            async () => {
              await fetch('/api/sentry-example-api').catch(() => undefined);
            }
          );
          setHasSentError(true);
          throw new SentryExampleFrontendError(
            'This error is raised on the frontend of the example page.'
          );
        }}
        style={{
          padding: '10px 18px',
          background: '#25d38f',
          color: '#04100e',
          borderRadius: 8,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Throw sample error
      </button>
      {hasSentError && (
        <p style={{ marginTop: 16, color: '#25d38f' }}>
          Sample error sent. Check your Sentry project (xolto-app).
        </p>
      )}
    </main>
  );
}
