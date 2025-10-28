/**
 * Test Environment Setup
 * Manually load .env.local for tests since Bun doesn't auto-load it
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');

  // Parse .env.local and set to process.env
  envContent.split('\n').forEach(line => {
    line = line.trim();

    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;

    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Only set if not already set
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });

  console.log('✅ Loaded .env.local for tests');
} catch (err) {
  console.warn('⚠️  Could not load .env.local:', (err as Error).message);
  console.warn('   Tests may fail if environment variables are not set');
}
