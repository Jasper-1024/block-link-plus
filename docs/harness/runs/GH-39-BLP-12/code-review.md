## Status

- Verdict: human-review-required
- Review Snapshot: base `1cb246ef08b4f64d03749f95105a1cfc17d7d3f3`, review tree `0434b0a03b5f4ff94816d2cfe59039983a759bf8`, diff SHA-256 `8e8a92c1c7f433695c8878efe9a282d33f292625b4c6bfe6ee539e337a17362b`

## Plane Reply

The pinned revision-8 tree is fresh and the implementation passes the focused
and full Jest suites, build, workflow check, and scoped lint. Independent
runtime checks reproduce host, block, heading, range, repeated-occurrence,
settings, source-sync, native-fallback, Global Search, and cleanup behavior
after a build/reload.

The review cannot recommend merge yet because the accepted routing contract
requires Obsidian 1.13.6, while the only post-build task runtime available to
this review reports 1.13.7. The implementation wraps private Obsidian
editor/search methods, so compatibility on the routed version is not proven.
Human review must decide whether that version drift and the observed cleanup
timing are acceptable for release or require another validation cycle.

## Blocking Findings

1. **The required compatibility target is unverified.** The routing contract
   requires the narrow adapter to be proven on Obsidian 1.13.6 and sends a
   broad private/global integration to Human Review
   (`docs/harness/runs/GH-39-BLP-12/implementation-routing.md:109-120,
   155-160`). The post-build runtime identity is Obsidian 1.13.7
   (`docs/harness/runs/GH-39-BLP-12/implementation.md:128-130`), while the
   new adapter wraps private `editor.searchCursor`/highlight/scroll/selection
   methods and the private document-search `hide` method
   (`src/features/inline-edit-engine/InlineEditSearchAdapter.ts:283-321`)
   and reads private MarkdownView search fields
   (`src/features/inline-edit-engine/InlineEditEngine.ts:1015-1028`). The
   successful 1.13.7 probes establish behavior for that runtime only; they do
   not establish compatibility for the accepted 1.13.6 target. This is a
   release/compatibility decision, not a claim that 1.13.7 failed.

## Non-Blocking Risks

- Preview-mode cleanup is timing-sensitive. The canonical implementation
  proof records zero managed participants after the mode transition, but two
  independent reruns of
  `.tmp/GH-39-BLP-12/mode-cleanup-proof.js` observed the old managed roots for
  the 700 ms probe window before a later preview check removed them. Search
  correctly excludes them as soon as `isLivePreviewHostView` is false, but the
  release expectation for immediate registry/leaf cleanup should be confirmed.
- `navigateSearchMatch` records the embed in `FocusTracker` before the guarded
  focus/selection/scroll calls (`src/features/inline-edit-engine/InlineEditEngine.ts:1283-1308`).
  A detach or private API exception in that window can leave a dead embed as
  the focused command target until lifecycle cleanup. The normal navigation
  path passed; no throwing-navigation regression is present.
- `getSearchVisibleRange` falls back from the CodeMirror range field to cached
  mount metadata during teardown (`src/features/inline-edit-engine/InlineEditEngine.ts:1228-1239`).
  This is safe in the exercised lifecycle, but a future partial teardown that
  leaves the cache while hiding source lines could expose stale searchable
  content.
- Full modified-file lint has four baseline findings in unchanged
  `InlineEditEngine.ts` lines 918, 984, 1341, and 1736. The new adapter and
  coordinator scoped lint is clean; unrelated baseline cleanup is out of
  scope.

## Contract Compliance

### Axis A — Contract / Spec

Passes:

- `editor:open-search` aggregation is limited to the active normal Markdown
  Live Preview host and explicitly host-associated BLP-managed participants;
  source-file equality is not used as ownership.
- Block/range, heading, and enabled full-note participants honor their
  existing settings. Visible ranges include read-only heading/range-marker
  lines and exclude hidden source and Outliner system-tail lines.
- Repeated references retain distinct managed IDs. The native-looking panel
  counts and navigates them independently, and embed navigation focuses and
  reveals without changing source content.
- No-managed and unsafe-participant paths fall back to the native host cursor.
  Global Search and native preview embeds remain outside the aggregate.

The two delegated boundary concerns were independently checked and are not
blocking findings in this snapshot:

- The `commands.executeCommand` `around` patch predates the review tree. The
  diff adds the local search bridge call inside that existing command-routing
  seam (`src/features/inline-edit-engine/InlineEditEngine.ts:916-968`); it
  does not add a second global command patch or a plugin-owned search UI.
  The bridge itself is local to `InlineEditSearchAdapter`.
- A nested fixture was mounted in the task runtime. Only the outer embed was
  managed; the nested token returned `0 / 0`. The nested native embed was
  inside the detached BLP root and was skipped by the existing nested guard.
  Probe: `node scripts/obsidian-cdp.js eval-file
  .tmp/GH-39-BLP-12/nested-embed-probe.js`.

## Correctness And Standards

### Axis B — Correctness / Standards

- `corepack pnpm exec jest src/features/inline-edit-engine
  src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts
  --runInBand`: 11 suites / 53 tests passed.
- `corepack pnpm test`: 50 suites / 280 tests passed.
- `corepack pnpm run build-with-types`: TypeScript and production esbuild
  passed.
- `corepack pnpm run agent:workflow-check`: passed.
- Scoped adapter/coordinator/test ESLint: passed with no errors or warnings.
- `corepack pnpm install --frozen-lockfile --reporter=append-only`: lockfile
  current; only the reported Node `url.parse` deprecation appeared.
- Inline CodeMirror checks passed for trusted `set` and `filter:false` source
  synchronization, read-only/partial edit rejection, range maintenance after
  full replacement, native fallback, stale match invalidation, and reload of
  the built plugin. The pure coordinator uses non-overlapping native-like
  match enumeration.

The independent post-build runtime matrix passed on the healthy recovered
task runtime: heading/system-tail/hidden-source filtering, repeated
occurrence navigation, range-marker read-only behavior, detached source
refresh, settings removal, full-note ownership/fallback, Global Search
isolation, native preview ownership, and final cleanup. The supplemental
navigation screenshot is `.tmp/GH-39-BLP-12/review-navigation.png`.

## Validation Limitations

- The accepted routing identity is Obsidian 1.13.6, but the task-owned live
  identity was `start - blp-BLP-12 - Obsidian 1.13.7` on vault `blp-BLP-12`,
  plugin `block-link-plus@2.0.17`, CDP port 19228. The canonical runtime
  package is `docs/harness/runs/GH-39-BLP-12/trace/implementation/runtime-search-proof-revision-8.json`.
- One bounded review probe,
  `.tmp/GH-39-BLP-12/review-mode-timing.js`, hung the CDP command. The exact
  probe process was terminated, runtime use stopped, and
  `blp_control_plane.ensure_runtime(fresh=true)` recovered the same
  task-owned identity. All subsequent bounded probes and cleanup passed; the
  hung probe is not treated as product evidence.
- Reading View content-search semantics were not independently measured; the
  isolated preview renderer exposed no rendered content and the accepted
  implementation deliberately installs no Reading View bridge.
- Unicode case-folding and unusual word-boundary parity remain unproved and
  are explicitly outside this bounded correction.
- Final independent cleanup returned `_debug/start.md` with no managed embeds,
  no Search leaf, no fixture files, and restored settings. The runtime was in
  Preview mode at that final check; this does not alter the feature verdict.

## Required Revisions

No product edit is prescribed by this review. Before merge, a human must
choose one of these bounded dispositions:

1. approve the known Obsidian 1.13.6/1.13.7 compatibility and lifecycle
   timing risk with explicit release tolerance; or
2. require a fresh build/reload/runtime proof on Obsidian 1.13.6 and, if
   immediate lifecycle disposal is required, a focused correction/test for
   the mode-transition cleanup timing.

If the 1.13.6 runtime cannot support the narrow adapter without a broader
private/global patch, return the compatibility choice to Human Review rather
than expanding this implementation.

## Decision

`human-review-required`: both automated review axes are substantially green,
the pinned tree is current, and the exercised runtime behavior matches the
accepted feature scope. Acceptance is withheld only for the unverified
version-sensitive private API boundary and the related lifecycle timing
judgment. Do not merge or release from this stage.
