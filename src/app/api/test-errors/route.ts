import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  OperationalError,
  IntegrationError,
  AuthenticationError,
  ValidationError,
  RateLimitError
} from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

// This endpoint is for testing error handling and monitoring
// DO NOT USE IN PRODUCTION - remove before deploying

async function testErrorHandler(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoints not available in production' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const errorType = searchParams.get('type');

  // Add test context to Sentry
  Sentry.setContext('error_test', {
    type: errorType,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });

  switch (errorType) {
    case 'operational':
      throw new OperationalError(
        'Test operational error',
        500,
        'TEST_OPERATIONAL',
        { testData: 'This is a test operational error' }
      );

    case 'integration_jobber':
      throw new IntegrationError(
        'jobber',
        'Test Jobber integration failure',
        new Error('Simulated API failure'),
        { endpoint: '/test', statusCode: 503 }
      );

    case 'integration_openphone':
      throw new IntegrationError(
        'openphone',
        'Test OpenPhone integration failure',
        new Error('Simulated connection timeout'),
        { timeout: 5000 }
      );

    case 'integration_supabase':
      throw new IntegrationError(
        'supabase',
        'Test Supabase database error',
        new Error('Connection pool exhausted'),
        { poolSize: 10 }
      );

    case 'auth':
      throw new AuthenticationError(
        'Test authentication failure',
        { provider: 'test', tokenExpired: true }
      );

    case 'validation':
      throw new ValidationError(
        'Test validation error',
        { field: 'testField', value: 'invalid', expectedFormat: 'email' }
      );

    case 'rate_limit':
      throw new RateLimitError(
        'test_service',
        60,
        { requestsPerMinute: 100, currentCount: 101 }
      );

    case 'unhandled':
      // Simulate an unhandled error
      throw new Error('This is an unhandled error for testing');

    case 'async_error':
      // Test async error handling
      setTimeout(() => {
        throw new Error('Async error that should be caught by global handler');
      }, 100);
      return NextResponse.json({ message: 'Async error triggered' });

    case 'promise_rejection':
      // Test unhandled promise rejection
      Promise.reject(new Error('Unhandled promise rejection test'));
      return NextResponse.json({ message: 'Promise rejection triggered' });

    case 'sentry_test':
      // Test direct Sentry capture
      Sentry.captureException(new Error('Direct Sentry test error'), {
        tags: { test: true },
        extra: { testContext: 'Direct capture test' },
      });
      return NextResponse.json({ message: 'Sentry test error sent' });

    case 'performance':
      // Test performance monitoring
      const transaction = Sentry.startTransaction({
        name: 'test_performance_transaction',
        op: 'test',
      });

      const span = transaction.startChild({
        description: 'Slow operation simulation',
        op: 'test.slow',
      });

      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      span.finish();
      transaction.finish();

      return NextResponse.json({ message: 'Performance test completed' });

    default:
      return NextResponse.json({
        message: 'Error testing endpoint',
        availableTypes: [
          'operational',
          'integration_jobber',
          'integration_openphone',
          'integration_supabase',
          'auth',
          'validation',
          'rate_limit',
          'unhandled',
          'async_error',
          'promise_rejection',
          'sentry_test',
          'performance',
        ],
        usage: 'Add ?type=<error_type> to test specific error scenarios',
      });
  }
}

export const GET = withErrorHandling(testErrorHandler, 'error_testing');