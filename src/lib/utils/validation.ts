import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

// Common validation schemas
export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(100, 'Display name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Display name contains invalid characters');

export const roomIdSchema = z
  .string()
  .min(1, 'Room ID is required')
  .max(100, 'Room ID is too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Room ID contains invalid characters');

export const roundNoSchema = z
  .number()
  .int('Round number must be an integer')
  .min(1, 'Round number must be at least 1')
  .max(20, 'Round number is too high');

export const answerTextSchema = z
  .string()
  .min(1, 'Answer cannot be empty')
  .max(5000, 'Answer is too long');

export const choiceIdSchema = z
  .string()
  .min(1, 'Choice ID is required')
  .max(100, 'Choice ID is too long');

export const topicSchema = z.string().max(200, 'Topic is too long').optional();

export const languageSchema = z
  .string()
  .length(2, 'Language must be 2 characters')
  .regex(/^[a-z]{2}$/, 'Language must be lowercase ISO 639-1 code');

export const numQuestionsSchema = z
  .number()
  .int('Number of questions must be an integer')
  .min(1, 'Must have at least 1 question')
  .max(20, 'Cannot have more than 20 questions');

export const roundTimeSecSchema = z
  .number()
  .int('Round time must be an integer')
  .min(5, 'Round time must be at least 5 seconds')
  .max(600, 'Round time cannot exceed 10 minutes');

export const capacitySchema = z
  .number()
  .int('Capacity must be an integer')
  .min(2, 'Capacity must be at least 2')
  .max(100, 'Capacity cannot exceed 100')
  .optional();

export const questionTypeSchema = z.enum(['open-ended', 'multiple-choice']);

export const battleDifficultySchema = z.enum(['easy', 'medium', 'hard']);

// Composite schemas
export const createRoomSchema = z.object({
  hostDisplayName: displayNameSchema,
  topic: topicSchema,
  categoryId: z.string().optional(),
  language: languageSchema.default('en'),
  numQuestions: numQuestionsSchema.default(10),
  roundTimeSec: roundTimeSecSchema.default(30),
  capacity: capacitySchema,
  questionType: questionTypeSchema.default('open-ended'),
  difficulty: battleDifficultySchema.optional(),
});

export const joinRoomSchema = z.object({
  displayName: displayNameSchema,
});

export const startBattleSchema = z.object({
  useAI: z.boolean().optional(),
});

export const submitAnswerSchema = z
  .object({
    answer_text: answerTextSchema.optional(),
    choice_id: choiceIdSchema.optional(),
    timeMs: z.number().int().min(0).optional(),
  })
  .refine(
    data => data.answer_text || data.choice_id,
    'Either answer_text or choice_id must be provided'
  );

export const mcqSubmitAnswerSchema = z.object({
  choice_id: choiceIdSchema,
});

export const openEndedSubmitAnswerSchema = z.object({
  answer_text: answerTextSchema,
});

// Validation middleware function
export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodIssue[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

// Middleware wrapper for API routes
export async function withValidation<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  handler: (
    validatedData: T,
    req: NextRequest
  ) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validation = validateRequest(schema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
          details: validation.details,
        },
        { status: 400 }
      );
    }

    return handler(validation.data, req);
  } catch (error) {
    console.error('Validation middleware error:', error);
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and other dangerous elements
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim()
    .slice(0, 5000); // Limit length
}
