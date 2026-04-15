import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  tunnel: '/monitoring',
  release: process.env.NEXT_PUBLIC_RELEASE,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
