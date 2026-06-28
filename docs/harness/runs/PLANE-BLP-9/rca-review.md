## Status

- Verdict: accepted

## Plane Reply

RCA review accepts the investigation. The failure is not a generic Obsidian wiki-link suggest problem: runtime evidence shows Obsidian asked the BLP File Outliner editor facade to replace `[[` with `[[2026-6-27]]` and move the caret to `ch: 13`, but `OutlinerSuggestEditor.transaction()` converted that selection against the pre-change `[[` document and dispatched CM selection `anchor: 2`. That leaves the caret after the opening brackets and the doc-change hook retriggers link suggest. Continue to fix design on the parent item; do not split.

## Accepted Facts

- The source issue is complete enough for this stage: it describes the observed stuck suggestion list, the caret remaining inside the completed wiki link, and the expected caret position after the closing `]]`; it is labeled `cdp-required`.
- Tracker feedback contains no human comments, links, or referenced pages, so there is no post-gate human feedback to reconcile beyond the original issue scope.
- The investigation included a usable runtime proof package for a runtime-gated editor interaction bug: fixed CDP port `19225`, isolated vault `blp`, Obsidian title reporting `Obsidian 1.12.4`, plugin `block-link-plus` version `2.0.16`, successful `corepack pnpm run build-with-types`, JSON trace, and screenshot evidence.
- The raw failure trace records Obsidian's autocomplete transaction replacing `{ line: 0, ch: 0 }..{ line: 0, ch: 2 }` with `[[2026-6-27]]` and requesting selection `{ line: 0, ch: 13 }`.
- The same trace records BLP dispatching the replacement to CM6 with selection `anchor: 2, head: 2`; after 600 ms the document is `[[2026-6-27]]`, the selection remains at offset `2`, and the suggestion manager is open with one visible suggestion container.
- The screenshot `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png` matches the reported UI symptom: completed link text is present while the suggestion list remains visible.
- Static source review matches the trace: `src/features/file-outliner-view/editor-suggest-bridge.ts:340` captures `const doc = this.cm.state.doc`; `src/features/file-outliner-view/editor-suggest-bridge.ts:351` maps transaction changes against that document; `src/features/file-outliner-view/editor-suggest-bridge.ts:357` maps `tx.selection` against the same pre-change document; `src/features/file-outliner-view/editor-suggest-bridge.ts:365` dispatches the resulting CM6 transaction.
- `posToOffset()` clamps a requested column to the current line length at `src/features/file-outliner-view/editor-suggest-bridge.ts:21`, so `ch: 13` against the old `[[` line becomes offset `2`.
- The follow-on suggest reopening is plausibly and sufficiently explained by the editor update path: `src/features/file-outliner-view/editor-state.ts:120` calls `onMaybeTriggerSuggest()` on doc changes, and `src/features/file-outliner-view/view.ts:1029` triggers Obsidian editor suggest while the custom editor still has focus.
- The reversible control patch is strong RCA support, not a source fix: interpreting transaction selection against post-change text ends with selection offset `13`, no after-cursor text, and no open suggestion container.

## Challenges

- The investigation's ownership claim survives review. The decisive evidence is that Obsidian supplied the correct post-insert selection before the BLP adapter dispatched the wrong CM6 selection.
- No native Obsidian Markdown editor control is required to leave the RCA loop. This is a custom File Outliner editor facade path, and the trace already captures Obsidian core handing the adapter a correct target selection.
- The RCA should not be reframed as "close the suggestion list after commit." Closing the popup would mask the symptom while leaving the caret at offset `2`, which is the state that causes the retrigger and violates the expected cursor placement.
- The control monkeypatch is not implementation validation. It only proves that the coordinate-space change is sufficient in the reproduced interaction; fix design still has to specify a production-safe mapping for multiline and multi-change transactions.

## Evidence Gaps

- No blocking RCA evidence gaps remain.
- Non-blocking implementation/design gaps: the production fix must handle multiline transaction selections, multi-change transactions, and existing `replaceSelection` behavior without assuming the one-line `[[` repro shape.
- Post-fix runtime validation has not run because this stage did not change source code.

## Required Investigation Follow-up

None. The next stage should proceed to fix design on the parent item. If future evidence contradicts the accepted coordinate-space RCA, return to investigation with a new runtime trace that captures the transaction payload and dispatched CM6 selection.

## Created Child Items

None. The investigation did not recommend `split-recommended` or `mitigation-child-recommended`, and this review accepts the bug as one parent-item fix unit.

## Decision

Accepted. The RCA is complete, current, and specific enough for fix design: the current runtime failure was reproduced in an isolated Obsidian/CDP environment, the trace separates Obsidian's requested editor transaction from BLP's dispatched CM6 transaction, static source explains the exact offset clamp, and the reversible runtime-only patch removes both observed symptoms by changing only the selection coordinate space.

The parent should continue to fix design for `OutlinerSuggestEditor.transaction()` selection mapping. The design should require targeted tests for transaction selection after replacement and a repeated CDP proof that selecting a wiki-link suggestion leaves the caret after `[[2026-6-27]]` and no suggestion container open after the wait period.

## Research Notes

- Required context and stage docs read: `AGENTS.md`, `WORKFLOW.md`, `docs/harness/README.md`, `docs/harness/guides/evidence-format.md`, `docs/harness/guides/cdp-runtime.md`, `docs/harness/guides/publishing.md`, `docs/harness/guides/quality-gates.md`, `docs/harness/guides/runtime-proof-package.md`, and `docs/harness/stages/rca-review.md`.
- Prior investigation artifact read: `docs/harness/runs/PLANE-BLP-9/investigation.md`.
- Tracker context read: `docs/harness/runs/PLANE-BLP-9/context/source-issue.md`, `docs/harness/runs/PLANE-BLP-9/context/tracker-feedback.md`, `docs/harness/runs/PLANE-BLP-9/context/tracker-feedback.json`, and `docs/harness/runs/PLANE-BLP-9/context/issue-context.json`.
- Runtime artifacts reviewed: `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-probe.json`, `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-control-patch.json`, and `docs/harness/runs/PLANE-BLP-9/trace/investigation/wiki-link-suggest-selection-open.png`.
- Source files inspected for the RCA challenge: `src/features/file-outliner-view/editor-suggest-bridge.ts`, `src/features/file-outliner-view/editor-state.ts`, and `src/features/file-outliner-view/view.ts`.
- Review commands included `rg` source/trace checks, JSON summaries through PowerShell `ConvertFrom-Json`, screenshot inspection, `git branch --show-current`, `git status --short`, and `docs/harness/workflow.json` inspection.

## Risks / Open Questions

- Fix design must decide the exact safe mapping strategy: construct the post-change document for `tx.selection`, use CM6 change descriptions, or another equivalent approach that handles multiline and multi-change transactions.
- Fix design should preserve behavior for `replaceRange()`, `replaceSelection()`, explicit `tx.changes`, and no-selection transactions.
- This review did not rerun the CDP probe live; it verified the durable investigation proof package and raw trace artifacts. That is sufficient for RCA acceptance, but implementation must rerun the runtime proof after a real source patch and rebuild.
