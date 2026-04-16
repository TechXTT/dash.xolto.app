# Test and Verify — xolto-app

Run this skill after making changes to verify nothing is broken.

## Steps

1. Run the build:

   ```
   npm run build
   ```

   If it fails, fix the errors before proceeding.

2. Run TypeScript check:

   ```
   npm run typecheck
   ```

3. Run lint:

   ```
   npm run lint
   ```

4. If any step fails, fix the issue and re-run from the beginning.

5. Confirm the following by inspecting the code:
   - Auth flow intact: login/register routes work, dashboard routes are protected
   - API calls go through `lib/api.ts`, not raw fetch
   - Data fetching uses React Query hooks from `lib/queries/`
   - No hardcoded API URLs — uses env vars
   - Mobile layout not broken: no fixed widths that exceed viewport, no horizontal overflow patterns

6. If UI components were changed, start the dev server and verify in browser:
   ```
   npm run dev
   ```
   Check at iPhone width (375px) that layouts render correctly.

## When done

Report which checks passed and any issues found.
