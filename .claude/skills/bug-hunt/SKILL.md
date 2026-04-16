# Bug Hunt — xolto-app

Use this skill to investigate and fix bugs. Follows a reproduce-diagnose-patch-verify cycle.

## Steps

### 1. Reproduce

- Understand the reported behavior and expected behavior
- Identify the route and component where the bug occurs
- Check if it's a data issue (API response), render issue (component), or state issue (React Query/Context)

### 2. Diagnose

- Read the relevant component and its data dependencies
- Trace API calls in `lib/api.ts` — is the request correct?
- Check React Query hooks in `lib/queries/` — stale data? missing invalidation?
- Check `DashboardContext.tsx` if it's a shared state issue
- Check auth flow if it's a protected route issue
- Look at error boundaries and error handling

### 3. Summarize

Before patching, state:

- **Root cause**: what exactly is wrong and why
- **Affected files**: which files need changes
- **Risk**: what else could break from the fix

### 4. Patch

- Make the minimal fix that addresses the root cause
- Keep auth semantics intact
- Keep React Query patterns consistent
- Don't refactor unrelated code

### 5. Verify

```
npm run build
npm run typecheck
```

Both must pass. Start the dev server and check the affected route at mobile width (375px).
