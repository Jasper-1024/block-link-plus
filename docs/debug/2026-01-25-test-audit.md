# Test Audit (2026-01-25)

## What I Checked

- Ran `npm run test:coverage` to spot untested/high-risk areas.
- Focused on Enhanced List enable-scope logic (folder/file/frontmatter gating), which is a core boundary for multiple features.

## Changes Made

- Added unit tests for:
  - `isEnhancedListEnabledFile` (enabled folders/files + frontmatter opt-in + non-md exclusion)
  - `getEnhancedListEnabledMarkdownFiles` (returns only enabled markdown files)

## Notes / Follow-ups

- Jest still prints: "A worker process has failed to exit gracefully..." (likely open handles/timers). All tests pass; if it becomes a CI issue, run `jest --detectOpenHandles` to pinpoint the leak.

