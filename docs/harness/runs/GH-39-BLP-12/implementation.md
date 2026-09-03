## Status

- State: Implementation
- Verdict: ready-for-review
- Work item: BLP-12 (`GH-39-BLP-12`)
- Revision: 8, after one bounded correction cycle from human code-review feedback

## Plane Reply

The accepted Live Preview-only current-note search is implemented. The bounded
correction cycle fixed trusted full/partial source synchronization, selective
editor range maintenance after full replacement, native-compatible
non-overlapping match enumeration, and active search count invalidation when a
managed participant changes or is removed. Focused tests, full Jest, build,
workflow check, scoped lint, and a fresh post-build task-owned CDP proof pass.
Independent code review should challenge the private Obsidian search/editor
adapter boundary, native cursor parity, and lifecycle timing.

## Scope

The accepted scope is current-note `editor:open-search` from a normal Markdown
Live Preview host. The aggregate contains that host plus connected, visible,
BLP-owned block, range, heading, and enabled full-note inline-edit embeds that
belong to the same host view. It preserves visible-range and hidden
Outliner-system-line filtering, repeated occurrence identity, detached focus
and reveal, native fallback, and settings/lifecycle cleanup.

Out of scope: Global Search indexing, Reading View content search, native
preview embed ownership, File Outliner/Journal Feed/other BLP surfaces,
nested embeds, search-and-replace across detached editors, source syntax
changes, package metadata, generated-file changes, and unrelated lint cleanup.

## Changes Made

- Added the narrow `InlineEditSearchCoordinator` pure seam for literal/regexp
  match collection across CodeMirror `Text` participants. It filters to
  visible lines, excludes hidden Outliner system-tail lines, preserves
  repeated participant occurrences, and advances past each non-empty match to
  match native non-overlapping enumeration.
- Added `InlineEditSearchAdapter` to wrap the existing host editor/search
  methods while retaining the native panel, cursor shape, navigation, replace
  fallback, highlighting, and fail-open behavior.
- Extended managed embed metadata with stable participant identity, kind,
  read-only state, and explicit host association. Host order is used to merge
  host and detached matches as one rendered document.
- Added lifecycle validation and cleanup for disconnected/hidden embeds, mode
  changes, settings changes, observer rescans, bridge disposal, and engine
  unload. Observer and settings cleanup explicitly refresh any still-active
  native search panel.
- Kept read-only/editable boundaries separate. Trusted Obsidian `set`
  transactions pass through the detached dispatch guard even with
  `filter:false`; direct edits remain rejected outside the editable range.
  Selective-editor ranges are clamped to the replacement document after a
  trusted full-document update.
- Observed managed detached CodeMirror dispatches. A participant document
  change clears stale embed highlights, re-runs the active native search, and
  immediately updates the visible count so debounced native refresh cannot
  leave stale totals.

## Tests Added Or Updated

- `InlineEditEngine.search.test.ts`: non-overlapping literal and regexp
  enumeration, visible-range/system-tail filtering, occurrence identity, and
  host ordering.
- `InlineEditSearchAdapter.test.ts`: native cursor shape, fallback,
  navigation/highlights, participant removal, stale-range validation, detached
  document dispatch, native refresh, and immediate count update.
- `InlineEditEngine.command-routing.test.ts`: host search aggregation and
  displayed count refresh after disabling a participant kind.
- `InlineEditEngine.mount-scroll.test.ts`: trusted `filter:false` source
  synchronization remains allowed while direct out-of-range edits remain
  rejected.
- `selectiveEditor.systemLine.test.ts`: trusted full-document replacement
  keeps partial-editor range fields valid.
- Existing Live Preview observer, heading-only read-only, file-embed, and
  layout/range regressions remain green.

## Slice Evidence

The routing contract defines three accepted slices. The original accepted
vertical implementation evidence is retained in the prior revision traces;
the entries below record the correction cycle and final revalidation.

| Slice | Mode | Before Command / Result | Change | After Command / Result | Refactor / Revalidation | Files Touched |
| --- | --- | --- | --- | --- | --- | --- |
| S-1 search semantics | `tdd` | `corepack pnpm exec jest src/features/inline-edit-engine/__tests__/InlineEditEngine.search.test.ts --runInBand` -> RED after native semantics were asserted: `aa` in `aaaa` returned overlapping `0-2`, `1-3`, `2-4` | Advance literal and regexp scans after each non-empty match | Same focused command -> PASS; literal returns `[0,2]`, `[2,4]`; regexp `a.a` returns `[0,3]` | Full inline-edit and repository suites rerun green | `InlineEditSearchCoordinator.ts`; `InlineEditEngine.search.test.ts` |
| S-2 host adapter and source state | `runtime-fix` plus focused regression | Pre-fix CDP showed partial detached source remaining stale after a source-file update, full trusted `filter:false` replacement rejected (`documentUpdated=false`), and settings removal left the panel at `1 / 2` while `findAll()` was empty | Allow trusted `set` transactions through every dispatch path; clamp ranges after full replacement; observe participant dispatch; refresh search and count immediately; validate cached matches against current text | Post-build CDP: partial search changes `1 / 1` -> `0 / 0` with old text absent; full replacement reports `documentUpdated=true`; settings changes `1 / 2` -> `0 / 0`; adapter/mount/command tests pass | Final build/reload and bounded host, navigation, range, heading, and full-note matrix rerun | `InlineEditEngine.ts`; `InlineEditSearchAdapter.ts`; `selectiveEditor.ts`; `InlineEditSearchAdapter.test.ts`; `InlineEditEngine.command-routing.test.ts`; `InlineEditEngine.mount-scroll.test.ts`; `selectiveEditor.systemLine.test.ts` |
| S-3 compatibility and lifecycle | `characterization` | Existing accepted lifecycle/range/ownership baseline was green; prior runtime baseline recorded native fallback and non-goals | Preserve explicit host ownership, settings/mode cleanup, native preview/Global Search isolation, and no nested recursion | Full Jest, build, workflow check, final CDP lifecycle/non-goal probes, and cleanup all pass | No unrelated lifecycle refactor; temporary probes remain under `.tmp/GH-39-BLP-12/` | `InlineEditEngine.ts`; `EmbedLeafManager.ts`; `index.ts`; lifecycle tests |

## Validation

| Command | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile --reporter=append-only` | PASS; lockfile up to date, dependencies already current; Node `url.parse` deprecation warning only |
| `corepack pnpm exec jest src/features/inline-edit-engine src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts --runInBand` | PASS; 11 suites / 53 tests |
| `corepack pnpm test` | PASS; 50 suites / 280 tests |
| `corepack pnpm run build-with-types` | PASS; TypeScript noEmit and production esbuild completed |
| `corepack pnpm run agent:workflow-check` | PASS; agent workflow check passed |
| `corepack pnpm exec eslint src/features/inline-edit-engine/InlineEditSearchAdapter.ts src/features/inline-edit-engine/InlineEditSearchCoordinator.ts src/features/inline-edit-engine/__tests__/InlineEditEngine.search.test.ts src/features/inline-edit-engine/__tests__/InlineEditSearchAdapter.test.ts --quiet` | PASS; no errors or warnings |
| `git diff --check` | PASS; no whitespace errors; normal LF-to-CRLF warnings only |

An additional lint run over every modified product/test file reported four
pre-existing findings in unchanged baseline lines of `InlineEditEngine.ts`:
three `@typescript-eslint/no-this-alias` findings at lines 918, 984, and 1341,
and one `prefer-const` finding at line 1736. The new adapter/coordinator scoped
lint passes; unrelated baseline lint cleanup is out of scope.

## Runtime Evidence

Canonical post-build proof package:
`docs/harness/runs/GH-39-BLP-12/trace/implementation/runtime-search-proof-revision-8.json`.

Runtime identity was validated with the task-owned lease and:
`node scripts/obsidian-cdp.js list` -> one page, `start - blp-BLP-12 - Obsidian
1.13.7`; `node scripts/obsidian-cdp.js eval "({title: document.title,
activeFile: app.workspace.getActiveFile()?.path, version: app.appVersion,
vault: app.vault.getName(), pluginLoaded:
!!app.plugins?.plugins?.['block-link-plus'], pluginVersion:
app.plugins?.plugins?.['block-link-plus']?.manifest?.version})"` -> vault
`blp-BLP-12`, plugin loaded, version `2.0.17`, active `_debug/start.md`.

The final build/reload was:

- `corepack pnpm run build-with-types` -> PASS.
- `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/reload-plugin.js`
  -> PASS; plugin loaded, version `2.0.17`.

The routing artifact named Obsidian `1.13.6`; the live identity after the
final reload reported `1.13.7`. All revision-8 probes use the live `1.13.7`
runtime on CDP port `19228`.

| Runtime claim | Exact probe | Important result |
| --- | --- | --- |
| Participant setup and visible ranges | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/range-setup.js` | PASS; block, heading, block, and range participants; visible `[5,6]`, `[8,10]`, `[5,6]`, `[12,14]`; editable range for heading/range `[9,10]`/`[12,13]` |
| Heading/system-tail/hidden-source/host search | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/bounded-host-search.js` with the four task queries | PASS; heading `1 / 1`, system-tail `0 / 0`, hidden source `0 / 0`, host-only `1 / 1`; aggregate cursor and bridge close count `0` |
| Repeated occurrence navigation | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/navigation-proof-fixed.js` | PASS; panel `1 / 2`; visits cycle across two distinct participant ids and closes with zero bridges |
| Range boundary and range search | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/range-edit-proof.js`; `.../range-search-proof.js` | PASS; visible `[12,14]`, editable `[12,13]`, marker read-only, direct/command errors null, source unchanged; range token `1 / 1` and focused detached range editor |
| Detached partial source refresh | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/review-partial-source-search.js` | PASS; `1 / 1` -> `0 / 0`, old query absent, new query present, aggregate `findAll()` zero, source restored |
| Active search after settings removal | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/review-settings-active-search.js` | PASS; `1 / 2` -> `0 / 0`, aggregate `findAll()` zero, disabled embeds removed from participants, bridge retained for the active host |
| Trusted full replacement | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/review-source-sync-full-event.js` | PASS; detached document updated to `# Only heading gh39-full-replacement-token`, `documentUpdated=true`, dispatch carried `userEvent=set` and changed `[0,413]`, source restored |
| Heading-only read-only behavior | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/heading-only-proof.js`; `.../heading-only-search-proof.js` | PASS; read-only heading is `contentEditable=false`, search count `1 / 2`, aggregate cursor |
| Full-note ownership and native fallback | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/final-file-native-setup.js`; `.../file-search-proof.js`; `.../final-file-managed-setup.js`; `.../file-search-proof.js` | PASS; native full-note embed remains unmanaged/native `0 / 0`; enabled BLP full-note embed is aggregate `1 / 1`; focused detached fallback remains native and zero-result |
| Preview lifecycle and Global Search isolation | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/mode-cleanup-proof.js`; `.../global-search-proof.js`; `.../final-preview-check.js` | PASS; preview removes managed participants/bridges while preserving native embed; Global Search returns one source-file result; preview bridge count zero |
| Final cleanup | `node scripts/obsidian-cdp.js eval-file .tmp/GH-39-BLP-12/final-cleanup.js`; `.../cleanup-state.js` | PASS; `_debug/start.md`, source mode, managed `0`, search leaves `0`, fixture files empty, settings restored |

The final proof does not claim native Reading View content-search semantics:
the isolated preview renderer exposed no rendered content, and the accepted
implementation deliberately does not install a Reading View bridge. A single
full-note setup was also invoked once after fixture cleanup and returned the
expected missing-fixture `ENOENT`; it was rerun after `final-setup.js` and the
native/managed full-note proofs passed. No feature claim relies on that failed
invocation.

## Files Changed

Product and test files:

- `src/features/inline-edit-engine/EmbedLeafManager.ts`
- `src/features/inline-edit-engine/InlineEditEngine.ts`
- `src/features/inline-edit-engine/index.ts`
- `src/features/inline-edit-engine/InlineEditSearchAdapter.ts`
- `src/features/inline-edit-engine/InlineEditSearchCoordinator.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.command-routing.test.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.heading-embed.test.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.live-preview-observer.test.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditEngine.search.test.ts`
- `src/features/inline-edit-engine/__tests__/InlineEditSearchAdapter.test.ts`
- `src/shared/utils/codemirror/selectiveEditor.ts`
- `src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts`

Canonical stage artifacts are under `docs/harness/runs/GH-39-BLP-12/`, with
temporary diagnostic probes under `.tmp/GH-39-BLP-12/`. No commit, merge, or
release was performed.

## Risks / Open Questions

- The adapter wraps private Obsidian 1.13.7 editor/search methods. Installation,
  refresh, disposal, and native fallback are guarded, but future Obsidian
  search-shape changes remain a compatibility risk.
- Native Reading View content search was not independently measured because the
  runtime preview surface exposed no content; it remains explicitly outside
  this implementation.
- Unicode case-folding and unusual word-boundary parity remain outside this
  bounded correction.
- The four modified-file lint findings are pre-existing baseline findings and
  are reported above; scoped new search-file lint is clean.

## Decision

`ready-for-review`: the accepted implementation exists, each accepted slice has
honest mode-appropriate evidence, the two human-confirmed review defects have
focused RED/GREEN or runtime-fix coverage, full tests/build/workflow pass, and
the final build has been reloaded and proven in the task-owned Obsidian runtime.
Proceed to independent code review; do not merge or release from this stage.
