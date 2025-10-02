import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  isOperational?: boolean;
}

export class OperationalError extends Error implements AppError {
  public readonly isOperational = true;
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class IntegrationError extends OperationalError {
  constructor(
    integration: 'jobber' | 'openphone' | 'supabase' | 'anthropic',
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `${integration.toUpperCase()} Integration Error: ${message}`,
      503,
      `${integration.toUpperCase()}_ERROR`,
      {
        integration,
        originalError: originalError?.message,
        ...context,
      }
    );
    this.name = 'IntegrationError';
  }
}

export class AuthenticationError extends OperationalError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, 'AUTH_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends OperationalError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends OperationalError {
  constructor(service: string, retryAfter?: number, context?: Record<string, any>) {
    super(
      `Rate limit exceeded for ${service}`,
      429,
      'RATE_LIMIT_ERROR',
      { service, retryAfter, ...context }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, operation?: string): NextResponse {
  let appError: AppError;

  if (error instanceof OperationalError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new OperationalError(error.message, 500, 'INTERNAL_ERROR', {
      stack: error.stack,
      operation,
    });
  } else {
    appError = new OperationalError(
      'An unknown error occurred',
      500,
      'UNKNOWN_ERROR',
      { error: String(error), operation }
    );
  }

  // Log error with context
  console.error(`API Error [${appError.code}]:`, {
    message: appError.message,
    operation,
    statusCode: appError.statusCode,
    context: appError.context,
    stack: appError.stack,
  });

  // Send to Sentry if it's not an operational error or if it's a high-severity operational error
  if (!appError.isOperational || appError.statusCode >= 500) {
    Sentry.captureException(appError, {
      tags: {
        operation,
        errorCode: appError.code,
        errorType: appError.name,
      },
      extra: {
        context: appError.context,
        statusCode: appError.statusCode,
      },
    });
  }

  // Return appropriate error response
  const response = {
    error: appError.message,
    code: appError.code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
      context: appError.context,
    }),
  };

  return NextResponse.json(response, { status: appError.statusCode });
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operation?: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, operation);
    }
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  context?: string
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw new OperationalError(
          `Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          500,
          'RETRY_EXHAUSTED',
          { context, attempts: attempt + 1, originalError: lastError.message }
        );
      }

      // Check if error is retryable
      if (error instanceof RateLimitError) {
        const delay = error.context?.retryAfter ? error.context.retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (error instanceof IntegrationError) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Integration error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }

  throw lastError!;
}

/**
 * Health check helper
 */
export async function checkServiceHealth(
  serviceName: string,
  healthCheck: () => Promise<boolean>,
  timeout: number = 5000
): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now();

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), timeout)
    );

    const healthy = await Promise.race([healthCheck(), timeoutPromise]);
    const responseTime = Date.now() - startTime;

    return { healthy, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.warn(`Health check failed for ${serviceName}:`, errorMessage);

    return {
      healthy: false,
      responseTime,
      error: errorMessage,
    };
  }
}