import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Configure integrations for server-side
  integrations: [
    Sentry.httpIntegration({
      tracing: {
        disableInstrumentationFor: [
          // Disable instrumentation for health check endpoints
          /^\/api\/health/,
          /^\/api\/ping/,
        ],
      },
    }),
    Sentry.nodeContextIntegration(),
    Sentry.localVariablesIntegration({
      captureAllExceptions: false,
    }),
  ],

  // Configure error filtering
  beforeSend(event, hint) {
    // Filter out development-only errors
    if (process.env.NODE_ENV === 'development') {
      return event;
    }

    // Filter out known non-critical errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip database connection timeout errors that auto-retry
      if (error.message.includes('connection timeout') && error.message.includes('retry')) {
        return null;
      }

      // Skip rate limiting errors from external APIs (these are handled gracefully)
      if (error.message.includes('THROTTLED') || error.message.includes('rate limit')) {
        return null;
      }

      // Skip authentication errors that are user-recoverable
      if (error.message.includes('Authentication error') && !error.message.includes('system')) {
        return null;
      }
    }

    return event;
  },

  // Configure tracing
  tracesSampler: (samplingContext) => {
    // Sample health checks at 0% in production
    if (samplingContext.request?.url?.includes('/api/health') ||
        samplingContext.request?.url?.includes('/api/ping')) {
      return 0.0;
    }

    // Sample API routes at higher rate
    if (samplingContext.request?.url?.includes('/api/')) {
      return process.env.NODE_ENV === 'production' ? 0.2 : 1.0;
    }

    // Sample everything else at normal rate
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
  },
});