# API Integration Tests

Tests for API routes using real HTTP requests against a running dev server.

## Setup

### Prerequisites

1. **Environment Variables**
   Make sure `.env.local` has all required variables:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. **Test Database** (Optional but recommended)
   Consider using a separate Supabase project for tests to avoid polluting production data.

## Running Tests

### Method 1: Manual Server (Recommended)

```bash
# Terminal 1: Start dev server
bun run dev

# Terminal 2: Run tests
bun test __tests__/api
```

### Method 2: Specific test file

```bash
# Run only sessions tests
bun test __tests__/api/sessions.test.ts

# Run with coverage
bun test --coverage __tests__/api/sessions.test.ts
```

### Method 3: Watch mode

```bash
bun test --watch __tests__/api
```

## Test Structure

```
__tests__/
├── api/                      # API route integration tests
│   ├── sessions.test.ts      # ✅ Example: Session creation
│   ├── rooms.test.ts         # TODO: Room operations
│   └── rooms-start.test.ts   # TODO: Battle start logic
├── helpers/                  # Test utilities
│   ├── test-server.ts        # Server management
│   ├── test-db.ts            # Database helpers
│   └── fixtures.ts           # Test data
└── README.md                 # This file
```

## Writing Tests

### Basic Structure

```typescript
import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import { getTestServerUrl } from '../helpers/test-server';

const BASE_URL = getTestServerUrl();

describe('API Endpoint', () => {
  afterEach(async () => {
    // Cleanup test data
  });

  test('should do something', async () => {
    const response = await fetch(`${BASE_URL}/api/...`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /* data */
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // assertions...
  });
});
```

### Best Practices

1. **Cleanup After Tests**
   Always clean up created data to avoid test pollution

   ```typescript
   afterEach(async () => {
     await cleanupTestRoom(roomId);
   });
   ```

2. **Track Created Resources**
   Store IDs of created resources for cleanup

   ```typescript
   let createdIds: string[] = [];
   afterEach(async () => {
     for (const id of createdIds) await cleanup(id);
   });
   ```

3. **Test Real Behavior**
   Test the full HTTP stack, including:
   - Status codes
   - Response body structure
   - Cookies/headers
   - Database side effects

4. **Test Edge Cases**
   - Invalid inputs
   - Missing fields
   - Concurrent requests
   - Error scenarios

5. **Avoid Flaky Tests**
   - Don't depend on timing
   - Clean up properly
   - Use unique test data

## Debugging Tests

### Enable Verbose Output

```bash
bun test --verbose __tests__/api/sessions.test.ts
```

### Check Server Logs

Watch the dev server terminal for API errors during test runs.

### Inspect Database

```typescript
// In test file
import { testDb } from '../helpers/test-db';

test('debug test', async () => {
  const { data } = await testDb.from('battle_sessions').select('*');
  console.log('Sessions:', data);
});
```

## Common Issues

### "Test server not running"

**Solution**: Start dev server first

```bash
bun run dev
```

### "Database constraint violation"

**Cause**: Previous test data not cleaned up properly  
**Solution**: Manual cleanup or improve afterEach hooks

### Tests fail randomly

**Cause**: Race conditions or shared state  
**Solution**:

- Use unique test data for each test
- Improve cleanup logic
- Add delays if needed (last resort)

## Next Steps

1. Add tests for remaining API routes
2. Create fixture factories for complex test data
3. Add E2E tests with Playwright (separate from these integration tests)
4. Set up CI/CD pipeline to run tests automatically

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run API tests
  run: |
    bun run dev &
    sleep 5
    bun test __tests__/api
```
