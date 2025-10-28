# 🧪 Quick Start: Running API Tests

## Step 1: Start Dev Server

Open **Terminal 1** and run:

```bash
bun run dev
```

Wait until you see:

```
✓ Ready in XXXXms
```

---

## Step 2: Run Tests

Open **Terminal 2** and run:

```bash
# Run all API tests
bun test __tests__/api

# Or specific test file
bun test __tests__/api/sessions.test.ts

# Watch mode (auto-rerun on changes)
bun test --watch __tests__/api

# With coverage
bun test --coverage __tests__/api
```

---

## Expected Output

```
✅ Test server is running at http://localhost:3001

✓ should create session with display name
✓ should create session without display name
✓ should reject invalid display name (too long)
✓ should handle special characters in display name
✓ should reject invalid JSON
✓ should handle missing Content-Type header
✓ should create unique session IDs
✓ should set cookie with correct attributes

8 tests passed in XXXms
```

---

## Troubleshooting

### "Test server not running"

**Cause**: Dev server belum start  
**Solution**: Run `bun run dev` di terminal lain

---

### "Missing Supabase env vars"

**Cause**: `.env.local` tidak ada atau incomplete  
**Solution**:

```bash
# Copy from example
cp .env.example .env.local

# Edit with your keys
# Make sure these are set:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

---

### Tests pollute database

**Cause**: Cleanup hooks tidak jalan  
**Solution**: Tests already have `afterEach` cleanup, tapi kalau perlu manual cleanup:

```typescript
import { testDb } from '../helpers/test-db';

// Clean all test sessions (sessions with "Test" in display name)
await testDb.from('battle_sessions').delete().like('display_name', '%Test%');
```

---

### Port conflict (server uses :3001 instead of :3000)

**Normal behavior** - Port 3000 sudah dipakai  
**Solution**: Tests automatically detect port from server URL

---

## Tips

- Use `--watch` mode untuk development efficiency
- Keep dev server running di background
- Tests run in ~150-200ms (fast!)
- Each test cleans up its own data automatically

---

## Next Steps

Once these tests pass, you can:

1. Add more tests for other endpoints
2. Run full test suite: `bun test`
3. Check coverage: `bun test --coverage`
