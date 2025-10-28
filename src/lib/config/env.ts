import { z } from 'zod';

/**
 * Environment Variable Validation Schema
 * Validates all required environment variables at startup
 * Prevents runtime errors from missing/invalid env vars
 */

const envSchema = z.object({
  // Supabase Configuration (Public - safe for client-side)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Supabase Service Role (Secret - server-side only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Google AI API Keys (Secret - server-side only, optional for testing)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Battle Configuration (Feature Flags)
  BATTLE_AUTO_REVEAL_NEXT: z
    .string()
    .transform(val => val === '1' || val === 'true')
    .default('1'),
  BATTLE_USE_AI: z
    .string()
    .transform(val => val === '1' || val === 'true')
    .default('1'),
  BATTLE_AUTO_ADVANCE: z
    .string()
    .transform(val => val === 'true' || val === '1')
    .default('true'),

  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Logs warnings for missing optional vars in development
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);

    // Warn about missing optional vars in development
    if (process.env.NODE_ENV === 'development') {
      const warnings: string[] = [];

      if (!parsed.NEXT_PUBLIC_SUPABASE_URL) {
        warnings.push('NEXT_PUBLIC_SUPABASE_URL not set');
      }
      if (!parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
      }
      if (!parsed.SUPABASE_SERVICE_ROLE_KEY) {
        warnings.push('SUPABASE_SERVICE_ROLE_KEY not set');
      }
      if (!parsed.GOOGLE_GENERATIVE_AI_API_KEY) {
        warnings.push(
          'GOOGLE_GENERATIVE_AI_API_KEY not set (AI features disabled)'
        );
      }

      if (warnings.length > 0) {
        console.warn('⚠️  Missing environment variables:');
        warnings.forEach(w => console.warn(`   - ${w}`));
        console.warn('   Copy values from .env.example to .env.local');
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      console.error('❌ Environment variable validation failed:');
      console.error(JSON.stringify(issues, null, 2));

      throw new Error(
        `Environment validation failed: ${issues.map(i => i.path).join(', ')}`
      );
    }
    throw error;
  }
}

// Validate and export
export const env = validateEnv();

/**
 * Type-safe environment variable access
 * Use this instead of process.env throughout the app
 */
export default env;
