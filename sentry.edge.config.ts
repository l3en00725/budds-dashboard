import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Configure error filtering
  beforeSend(event, hint) {
    // Filter out development-only errors
    if (process.env.NODE_ENV === 'development') {
      return event;
    }

    // Filter out known non-critical errors
    const error = hint.originalException;
    if (error instanceof Error) {
      // Skip CORS errors that are expected
      if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
        return null;
      }

      // Skip validation errors that are user input related
      if (error.message.includes('validation') && error.message.includes('input')) {
        return null;
      }
    }

    return event;
  },
});