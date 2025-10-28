/**
 * Client-side error handling utilities for standardized API error responses
 */

import { ApiError } from '../api/api-errors';
import { apiLogger } from './logger';

export interface ClientError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
  timestamp?: string;
}

/**
 * Parse API error response into a standardized client error
 */
export function parseApiError(error: unknown): ClientError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message:
        'Network connection failed. Please check your internet connection.',
      retryable: true,
    };
  }

  // Handle Response objects (from failed fetch)
  if (error instanceof Response) {
    return {
      code: 'HTTP_ERROR',
      message: `Request failed with status ${error.status}`,
      retryable: error.status >= 500 || error.status === 429,
    };
  }

  // Handle API error responses
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = (error as { error: ApiError }).error;
    return {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      retryable: apiError.retryable,
      timestamp: (apiError as ApiError & { timestamp?: string }).timestamp,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: true,
    };
  }

  // Handle unknown errors
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    retryable: true,
  };
}

/**
 * Get user-friendly error message based on error code
 */
export function getErrorMessage(error: ClientError): string {
  switch (error.code) {
    case 'MISSING_SESSION':
      return 'Your session has expired. Please refresh the page and try again.';

    case 'NOT_PARTICIPANT':
      return 'You are not a participant in this room. Please rejoin the room.';

    case 'ROUND_NOT_FOUND':
      return 'This round could not be found. The room may have been updated.';

    case 'ROUND_NOT_ACTIVE':
      return 'This round is not currently active. Please wait for the next round.';

    case 'ROUND_ALREADY_ANSWERED':
      return 'You have already answered this round.';

    case 'DEADLINE_PASSED':
      return 'The time limit for this round has expired.';

    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment before trying again.';

    case 'NETWORK_ERROR':
      return 'Connection failed. Please check your internet connection and try again.';

    case 'SERVICE_UNAVAILABLE':
      return 'Service is temporarily unavailable. Please try again later.';

    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Check if an error should trigger a retry
 */
export function shouldRetryError(
  error: ClientError,
  attemptCount: number = 0
): boolean {
  if (!error.retryable) return false;
  if (attemptCount >= 3) return false; // Max 3 retries

  // Don't retry certain error types
  const noRetryCodes = ['MISSING_SESSION', 'NOT_PARTICIPANT', 'INVALID_INPUT'];
  return !noRetryCodes.includes(error.code);
}

/**
 * Handle API errors with user notifications
 */
export function handleApiError(
  error: unknown,
  showNotification?: (
    message: string,
    type?: 'error' | 'warning' | 'info'
  ) => void
): ClientError {
  const clientError = parseApiError(error);
  const message = getErrorMessage(clientError);

  if (showNotification) {
    const notificationType = clientError.retryable ? 'warning' : 'error';
    showNotification(message, notificationType);
  }

  apiLogger.error('API Error', {
    code: clientError.code,
    message: clientError.message,
    details: clientError.details,
    retryable: clientError.retryable,
    timestamp: clientError.timestamp,
  });

  return clientError;
}

/**
 * Create a retry function with exponential backoff
 */
export function createRetryFunction<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): () => Promise<T> {
  return async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const clientError = parseApiError(error);

        if (!shouldRetryError(clientError, attempt)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          apiLogger.debug(
            `Retry attempt ${attempt + 1}/${
              maxRetries + 1
            } failed, retrying in ${delay}ms`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
}
