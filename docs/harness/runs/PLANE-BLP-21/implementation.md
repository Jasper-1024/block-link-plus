# BLP-21 — Native navigation history

Status: implemented; awaiting human acceptance. Foreground sequential implementation, no runner.

## Scope and evidence mode

User requested native Obsidian Back/Forward for File Outliner. Runtime-fix seam: native workspace navigation commands, real bullet/fold DOM clicks and openFile block links. No source-data changes and no custom history stack. Baseline commit: 35e18b6.

## Runtime proof

- Obsidian 1.13.6; plugin block-link-plus 2.0.20; isolated vault blp-21-navigation-audit; CDP 19521; local master checkout.
- Built with `corepack pnpm run build-with-types`; reloaded via app.plugins disablePlugin/enablePlugin.
- Before: `.tmp/blp-21/baseline.js` via `node scripts/obsidian-cdp.js --port 19521 eval-file`: native Back reopened navigation.md but scroll 1000 became 0; ephemeral state was empty. Bullet zoom added no native history entry; Back left the file.
- After: `node scripts/obsidian-cdp.js --port 19521 eval-file scripts/cdp-snippets/regression/file-outliner/navigation-history.js` passed cross-file back/forward, scroll 900 restoration, collapsed state, zoom back/forward, same-file block-link back/forward and unchanged source text. Cleanup passed.
- `corepack pnpm test -- --runInBand`: 52 suites / 338 tests passed.
- Final build-with-types, agent:workflow-check and diff whitespace check passed. Global Search click regression passed after fixing its cleanup to detach only Search leaves it created. First run navigated correctly but failed cleanup because a new Search pane remained; that first run is not counted as passing.
- Initial promoted snippet invocation was rejected because the catalog entry was missing; added entry and reran successfully. This was a test registration error, not a runtime product failure.

## Implementation and review

Use public View state/ephemeral-state methods and ViewStateResult.history. Zoom and jump targets identify visits; collapsed IDs, scroll and selection belong to ephemeral state. Core owns history recording and popstate replay. Clear cancels deferred scroll restoration; stale block IDs are filtered; disabled Zoom is respected. Existing ancestor path is not repurposed as visit history.

Foreground standards review: changes remain scoped to File Outliner state and routing; no core monkey patches beyond existing openFile routing. Spec review: accepted visit/return paths verified; no replacement/search feature added. Desktop runtime only; mobile and arbitrary third-party renderer compatibility not proved.

## Handoff

Use the native arrows or Back/Forward commands after zooming or following a block link. Await user acceptance before marking Done. No remote push or release.
