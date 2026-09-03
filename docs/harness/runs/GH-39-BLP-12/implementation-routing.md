## Status

- State: Implementation Routing
- Verdict: same-task-ready
- Work item: BLP-12 (`GH-39-BLP-12`)

## Plane Reply

Human approval accepts the bounded Live Preview-only design. Route BLP-12 to
the normal implementation -> code-review loop on the same work item. The
implementation must aggregate the host editor with BLP-owned inline-edit
embeds, preserve visible-range semantics, use native search/fallback behavior,
and leave the explicitly listed non-goals unchanged.

## Accepted Design

The accepted source is `approved-design.md`, bound to the Plane Design Approval
Page by `approved-design.json`:

- Plane page: `717efb27-ac59-4604-9d3e-0e43612f5708`
- Declared content SHA-256: `d855a195bd3f19c7d57b6082f1ed849e7fc3be1ea5a4a2657ef6e066bc2a9ca9`
- Approved at: `2026-09-01T14:02:18Z`

The accepted implementation contract is:

- Extend current-note `editor:open-search` in a normal Markdown `MarkdownView`
  in Live Preview only.
- Aggregate the host CodeMirror editor with the BLP-managed inline-edit
  editors mounted in that particular host. Host association must be explicit;
  source-file equality alone must not cause embeds from another rendered note
  to participate.
- Include block/range embeds, heading embeds, and full-note embeds only when
  `inlineEditEnabled` and the corresponding existing settings
  (`inlineEditBlock`, `inlineEditHeading`, `inlineEditFile`) allow BLP to own
  the editor. A full-note embed participates only when `inlineEditFile` is
  enabled.
- Search only the rendered/visible content of each participant. For block,
  range, and heading embeds, use the resolved visible line range; include
  visible read-only heading or range-marker lines; exclude hidden source lines
  and hidden Outliner system-tail lines. Searchable range and editable range
  are distinct.
- Count every visible occurrence. Repeated references to the same source note
  are separate occurrences, not deduplicated by file or subpath.
- Reuse the native-looking document-search panel and query/navigation semantics
  where the supported Obsidian version permits. Navigating to an embed match
  must focus that detached editor and reveal the matching visible line without
  changing source content.
- If aggregation cannot be installed safely, fail open to the existing native
  single-editor search. The no-managed-embed path must retain current native
  behavior.
- Keep ownership and compatibility logic inside a narrow `InlineEditEngine`
  adapter/coordinator. Do not introduce a global command patch or a new
  plugin-owned search UI in this first slice.
- Remove stale participants on detach, hidden/disconnected DOM, mode/layout
  changes, settings changes, and engine unload. Do not recurse into nested
  embeds.

## Human Feedback Considered

`context/tracker-feedback.md` records `Review Approved` and one human comment:
accept the bounded Live Preview-only design, search across BLP-owned inline-edit
embeds, keep Global Search, Reading View, and native preview embeds unchanged,
and use visible-range semantics with native fallback when aggregation is
unavailable.

This feedback agrees with the approved design and does not amend its scope.
There is no conflict requiring a return to Human Review.

## Routing Decision

Use `same-task-ready`.

This is one coherent user-visible current-note search capability owned by the
existing `InlineEditEngine` and `EmbedLeafManager` seam. The work has several
vertical test slices, but they share participant ownership, native-panel
integration, navigation, and lifecycle cleanup and must be validated together
as one command behavior. Splitting them into AFK children would fragment the
contract and make each child depend on the other children’s runtime wiring.

The normal implementation and independent code-review stages can execute the
plan below without another product decision. No child work items are created.

## Implementation Contract

Implementation may add a small pure coordinator/adapter seam under
`src/features/inline-edit-engine/`, extend the existing managed-embed metadata
as needed to associate an embed with its host view, and add focused tests under
the existing inline-edit-engine test directory. Preserve the current
`EmbedLeafManager.getActiveEmbeds()` lifecycle and `InlineEditEngine` Live
Preview guards; do not broaden the participant registry to Journal Feed,
File Outliner, or other BLP surfaces.

The coordinator must distinguish:

1. the host editor’s document matches;
2. matches in each connected, visible, BLP-owned detached editor belonging to
   the host; and
3. hidden lines inside a detached editor, which must not become matches merely
   because CodeMirror retains the underlying source document.

The implementation must preserve the existing command-routing behavior when an
embed already owns focus, while adding host-initiated aggregation. Native
preview DOM is not a participant unless it has been mounted by BLP under the
accepted settings. Search navigation may use the existing focus/reveal APIs,
but must not synthesize mount-time cursor or scroll side effects or mutate
source documents.

If the supported Obsidian version cannot support the narrow adapter without a
broad private/global patch or a plugin-owned search UI, stop with a design
mismatch and return the compatibility choice to Human Review. Do not silently
choose that broader architecture.

Runtime handoff for the implementation stage:

- Task: BLP-12; source: GitHub `Jasper-1024/block-link-plus#39`; archive:
  `GH-39-BLP-12`.
- Worktree: `C:\Users\stati\Documents\Codex\2026-06-13\hermes\outputs\plane-symphony-like-demo\workspaces\GH-39-BLP-12`.
- Branch: `symphony/GH-39-BLP-12`.
- Runtime: Obsidian `1.13.6`, vault `blp-BLP-12`, plugin
  `block-link-plus@2.0.17`, CDP port `19228`.
- Existing design baseline: `docs/harness/runs/GH-39-BLP-12/trace/design-intake/runtime-search-baseline.json`.
- Routing-time identity commands passed:
  `node scripts/obsidian-cdp.js list` and
  `node scripts/obsidian-cdp.js eval "({title: document.title, activeFile: app.workspace.getActiveFile()?.path, version: app.appVersion, vault: app.vault.getName(), pluginLoaded: !!app.plugins?.plugins?.['block-link-plus']})"`.
- This stage did not build, reload, or claim feature behavior. After each
  runtime slice, implementation must build/reload the plugin and store the
  exact post-change probe output under
  `docs/harness/runs/GH-39-BLP-12/trace/implementation/`.

## TDD Slice Plan

The implementation stage must execute slices one at a time and use honest
mode-specific before/after evidence from `docs/harness/guides/tdd.md`.

| Slice | Mode | Behavior | Public Seam | Before Evidence | Minimum Change | After Evidence | Refactor Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | tdd | A search coordinator returns host and BLP-owned embed matches, keeps repeated embed occurrences distinct, includes visible read-only marker/heading lines, and filters hidden/outliner system-tail lines. | A pure exported search/participant API plus CM document/range inputs; tests must not rely on private Obsidian search internals. | Add the focused search test and run `corepack pnpm exec jest src/features/inline-edit-engine/__tests__/InlineEditEngine.search.test.ts --runInBand`; it must fail for the accepted embed-only/hidden-line behavior before the coordinator exists. | Add the smallest participant model and visible-line/match aggregation logic, reusing existing range metadata without changing editor content or settings. | Rerun the same targeted Jest command and require the accepted counts, occurrence identities, offsets/lines, and range exclusions to pass. | Extract only names/types/helpers that improve the coordinator seam after the behavior is green. |
| S-2 | tdd | A host-focused `editor:open-search` invocation uses the native current-note search surface when safe, aggregates S-1 participants, and next/previous navigation focuses and reveals an embed match; native host-only fallback remains available. | The existing `InlineEditEngine` command integration and the native document-search panel/command in the task runtime; no Global Search API. | Reproduce the approved baseline where a host query for an embed-only token returns `0 / 0`, while the focused detached editor returns `1 / 1`; record the exact CDP result before the adapter. | Install the narrow InlineEditEngine-local adapter/coordinator and navigation bridge, with guarded fallback when the native surface cannot be extended. | Rerun the same CDP proof after `corepack pnpm run build-with-types` and plugin reload: host search counts embed matches, repeated occurrences navigate independently, and no-match/native fallback behavior remains intact. Add/maintain targeted Jest coverage for command routing and navigation callbacks. | Refactor adapter boundaries or match ordering only after the native runtime proof and targeted tests are green. |
| S-3 | characterization | Settings, ownership, lifecycle, and non-goal compatibility remain bounded: disabled settings/no inline edit, disconnected or hidden embeds, Live Preview mode changes, Global Search, Reading View/native preview embeds, and other BLP surfaces do not enter the aggregate. | `InlineEditEngine`/`EmbedLeafManager` lifecycle seam, existing inline-edit tests, and the task-owned CDP surfaces. | Record the existing green lifecycle/range baseline with the relevant focused Jest tests and the approved runtime baseline; do not label already-working behavior as RED. | Add only the participant registration/cleanup guards and characterization regressions needed to prove the accepted gates and native fallback. | Run focused tests, then `corepack pnpm test`, `corepack pnpm run build-with-types`, and the final CDP regression after reload. Confirm cleanup leaves no stale participants or Search leaf and that Global Search/Reading View/native preview results are unchanged. | Cleanup or small extraction is allowed only from a green baseline; no unrelated lifecycle refactor. |

The final implementation validation must also run
`corepack pnpm run agent:workflow-check` and report any command that cannot run.
The CDP regression should cover host, block/range, heading, and enabled
full-note embeds; visible-range and system-tail filtering; repeated
occurrences; settings gates; navigation/focus/reveal; lifecycle cleanup; and
the listed non-goals.

## Child Tasks

None. No Plane child work items were created; the parent remains the single
implementation unit.

## Risks / Open Questions

- Native document-search integration is version-sensitive. The first attempt
  must stay within the accepted narrow adapter boundary on Obsidian `1.13.6`.
  A broad private/global patch or a plugin-owned aggregate UI is a new product
  and compatibility decision, not an implementation detail.
- CodeMirror’s underlying detached document contains lines that BLP hides with
  decorations. Tests and runtime probes must prove visual-range filtering
  independently from editable-range filtering.
- Multiple visible references can share a source file. Host identity and
  occurrence identity must prevent cross-host leakage and file-level
  deduplication.
- The existing design trace records exploratory CDP timeouts that were
  recovered and produced no design claim. The implementation must rely on a
  fresh post-build/reload proof package, not those exploratory failures.
- If the accepted behavior or compatibility boundary cannot be proved at a
  stable seam, stop with `blocked-design-mismatch`/Human Review rather than
  broadening the scope.

## Decision

`same-task-ready`: BLP-12 has an approved, non-conflicting, executable design;
the existing InlineEditEngine ownership seam is sufficient for one normal
implementation loop; and the task-owned runtime is ready for the required
post-build CDP regression. Proceed to implementation on BLP-12, then code
review.
