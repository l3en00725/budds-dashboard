import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Replay configuration for user session debugging
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
      // Mask sensitive form inputs
      maskAllInputs: true,
      // Block network requests that might contain sensitive data
      networkDetailAllowUrls: [
        // Allow dashboard API calls for debugging
        /\/api\/dashboard\//,
        /\/api\/debug\//,
      ],
    }),
    Sentry.browserTracingIntegration({
      // Disable automatic route change tracking
      enableInp: true,
    }),
  ],

  // Configure error filtering for client-side
  beforeSend(event, hint) {
    // Filter out development-only errors
    if (process.env.NODE_ENV === 'development') {
      return event;
    }

    // Filter out known non-critical client errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip network errors that are transient
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return null;
      }

      // Skip script loading errors (often caused by ad blockers)
      if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
        return null;
      }

      // Skip ResizeObserver errors (browser quirks)
      if (error.message.includes('ResizeObserver')) {
        return null;
      }
    }

    return event;
  },

  // Configure user context
  initialScope: {
    tags: {
      component: 'dashboard',
    },
  },
});