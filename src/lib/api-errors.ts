/**
 * Standardized API Error Response System
 * Provides consistent error handling across all battle API endpoints
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export class ApiErrorResponse extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "ApiErrorResponse";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
  }
}

// Predefined error types for consistency
export const ERROR_TYPES = {
  // Authentication & Authorization
  MISSING_SESSION: new ApiErrorResponse(
    "MISSING_SESSION",
    "Authentication required. Please refresh the page.",
    401,
    undefined,
    false
  ),

  INVALID_SESSION: new ApiErrorResponse(
    "INVALID_SESSION",
    "Session expired. Please rejoin the room.",
    401,
    undefined,
    false
  ),

  NOT_PARTICIPANT: new ApiErrorResponse(
    "NOT_PARTICIPANT",
    "You are not a participant in this room.",
    403,
    undefined,
    false
  ),

  // Room & Round Errors
  ROOM_NOT_FOUND: new ApiErrorResponse(
    "ROOM_NOT_FOUND",
    "Room not found or has been deleted.",
    404,
    undefined,
    false
  ),

  ROUND_NOT_FOUND: new ApiErrorResponse(
    "ROUND_NOT_FOUND",
    "Round not found.",
    404,
    undefined,
    false
  ),

  ROUND_NOT_ACTIVE: new ApiErrorResponse(
    "ROUND_NOT_ACTIVE",
    "This round is not currently active.",
    400,
    undefined,
    false
  ),

  ROUND_ALREADY_ANSWERED: new ApiErrorResponse(
    "ROUND_ALREADY_ANSWERED",
    "You have already answered this round.",
    409,
    undefined,
    false
  ),

  // Time & Deadline Errors
  DEADLINE_PASSED: new ApiErrorResponse(
    "DEADLINE_PASSED",
    "The time limit for this round has expired.",
    400,
    undefined,
    false
  ),

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: new ApiErrorResponse(
    "RATE_LIMIT_EXCEEDED",
    "Too many requests. Please wait before trying again.",
    429,
    undefined,
    true
  ),

  // Data Validation
  INVALID_INPUT: new ApiErrorResponse(
    "INVALID_INPUT",
    "Invalid input data provided.",
    400,
    undefined,
    false
  ),

  MISSING_QUESTION_DATA: new ApiErrorResponse(
    "MISSING_QUESTION_DATA",
    "Question data is not available.",
    500,
    undefined,
    true
  ),

  // Database & System Errors
  DATABASE_ERROR: new ApiErrorResponse(
    "DATABASE_ERROR",
    "Database operation failed.",
    500,
    undefined,
    true
  ),

  PUBLISH_ERROR: new ApiErrorResponse(
    "PUBLISH_ERROR",
    "Failed to broadcast event.",
    500,
    undefined,
    true
  ),

  // Generic Errors
  INTERNAL_ERROR: new ApiErrorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred.",
    500,
    undefined,
    true
  ),

  SERVICE_UNAVAILABLE: new ApiErrorResponse(
    "SERVICE_UNAVAILABLE",
    "Service temporarily unavailable.",
    503,
    undefined,
    true
  ),
} as const;

/**
 * Create a standardized error response for Next.js API routes
 */
export function createErrorResponse(error: ApiErrorResponse | Error | unknown) {
  // If it's already an ApiErrorResponse, use it directly
  if (error instanceof ApiErrorResponse) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
          ...(error.retryable && error.statusCode === 429
            ? { "Retry-After": "5" }
            : {}),
        },
      }
    );
  }

  // Handle Zod validation errors
  if (error && typeof error === "object" && "issues" in error) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details: { issues: (error as { issues: unknown }).issues },
          retryable: false,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Unhandled API error:", error);

  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details:
          process.env.NODE_ENV === "development"
            ? { originalMessage: message }
            : undefined,
        retryable: true,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Helper to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiErrorResponse) {
    return error.retryable;
  }
  return false;
}

/**
 * Helper to get error code from an error
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ApiErrorResponse) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}
