## Status

- Verdict: accepted
- Task: BLP-4 / GitHub #36, Android embed scrolling jumps back to initial position.
- Reviewer scope: adversarial fix-design review only; no product source, tests, generated files, CDP snippets, package metadata, or OpenSpec specs were edited.
- Start git status observed by reviewer: `?? docs/agent/runs/BLP-4/`.
- Artifact validation: `corepack pnpm run agent:workflow-check` passed.

## Plane Reply

The revised design is accepted for implementation.

What is accepted: implement the first patch in `InlineEditEngine.mountInlineEmbedCore` so passive Live Preview inline-edit mounts skip embedded-editor `setCursor` and `scrollIntoView(..., true)`, while non-passive outliner mounts keep their existing behavior. This follows the accepted RCA: BLP-owned passive mount reveal work was captured in the scroll-displacement stacks.

What implementation must not do silently: do not add a host scroll guard as part of the first patch. Run the CDP scroll-stability probe after removing passive reveal calls. If large no-input host drift remains after plugin-origin `scrollIntoView` stacks are gone, stop with evidence or route back to design before adding a guard.

The next stage should implement the narrow passive-mount gate, add targeted tests, and validate click/focus readiness plus the existing native embed jump affordance regressions.

## Accepted Design Points

- The design follows the accepted RCA boundary. The owner layer stays in `src/features/inline-edit-engine/InlineEditEngine.ts`, especially observer-driven Live Preview inline-edit mount work.
- The passive/non-passive split is supported by current source:
  - `processInlineEmbed` calls `mountInlineEmbedCore(..., { requireLivePreview: true, hostView, origin: "live-preview" })` at `src/features/inline-edit-engine/InlineEditEngine.ts:1649`.
  - `mountInlineEmbedInOutliner` calls the same core path with `{ requireLivePreview: false, origin: "outliner" }` at `src/features/inline-edit-engine/InlineEditEngine.ts:162`.
- Gating the block at `src/features/inline-edit-engine/InlineEditEngine.ts:1828` to `1837` is coherent with runtime evidence because that block performs embedded-editor `setCursor` and explicit `scrollIntoView(..., true)` during passive mount.
- The revised design correctly drops the earlier first-patch host scroll guard. That removes the main prior blocker: an Android-unsafe guard could fight real touch or inertial scrolling, while a scroll-event-canceling guard could cancel itself on the programmatic drift it was meant to correct.
- The design keeps `.markdown-embed-link` ownership out of scope and preserves the existing native affordance contract. `prepareEmbedShell` still mounts BLP inside `.markdown-embed-content` without relocating the top-level native jump link.
- The fallback guard requirements are specific enough as a future design constraint, but not part of the accepted first implementation scope.
- No OpenSpec proposal is required for this patch. The design restores expected passive mount behavior instead of introducing a new product capability.

## Challenges

- The first patch may not eliminate all host scroll drift because `cm.requestMeasure`, host `requestMeasure`, and `attachHostRemeasure` remain active. This is acceptable only because the design makes CDP scroll-stability a gate and says not to ship silently if drift remains.
- Removing passive `setCursor` could expose a click/edit-readiness problem if embedded editors depend on mount-time cursor initialization. The design handles this by requiring explicit click/focus validation and by constraining any fallback cursor helper to actual user interaction.
- The design intentionally does not prove Android 13 symptom parity. It proceeds from accepted Desktop CDP evidence of BLP-owned host scroll displacement, with Android/mobile left as a validation risk.
- The CodeMirror transaction checklist does not block this design:
  - There is no proposed transaction interception path for undo/history to bypass.
  - The design does not rely on `transactionFilter`, including for `filter:false` transactions.
  - It leaves the existing `contentRange` / `editableRange` annotation dispatch and `hideLine` decoration/state-field path intact.
  - Existing undo/redo range coverage lives in `src/shared/utils/codemirror/__tests__/selectiveEditor.systemLine.test.ts`; new ordinary text undo tests are not required unless implementation changes selective editor or range behavior.

## Required Revisions

- None before implementation.
- Implementation guardrail: the first patch must stay limited to passive Live Preview mount selection/reveal gating unless post-change CDP evidence proves a second design step is required.
- Implementation guardrail: if a user-interaction cursor fallback becomes necessary, it must run only from actual click/mousedown/focus interaction, never from observer-driven passive mount, and it must avoid `scrollIntoView(..., true)`.

## Implementation Readiness

Ready for implementation.

Smallest accepted implementation scope:

- Add a small passive Live Preview mount classifier near `mountInlineEmbedCore`.
- Compute the passive flag inside `mountInlineEmbedCore` after the existing early-return checks.
- Skip only the embedded-editor `setCursor` / `scrollIntoView(..., true)` block for passive `origin: "live-preview"` mounts.
- Preserve non-passive outliner behavior.
- Preserve shell preparation, embedded view creation/reparenting, inline-edit range annotation dispatch, debug surfaces, host remeasure setup, and native `.markdown-embed-link` behavior.
- Do not add a host scroll preservation guard in the initial implementation.

Expected changed source:

- `src/features/inline-edit-engine/InlineEditEngine.ts`

Expected tests:

- Focused inline-edit engine tests under `src/features/inline-edit-engine/__tests__/`.
- No package metadata, generated bundle, OpenSpec, or unrelated feature files should change in the implementation patch.

## Validation Coverage

Source/API checks performed by this review:

- `src/features/inline-edit-engine/InlineEditEngine.ts:162` to `188`: outliner mount uses `origin: "outliner"` and `requireLivePreview: false`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:983` to `1115`: Live Preview observer queues `.internal-embed.markdown-embed` nodes and processes them through `processInlineEmbed`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1531` to `1598`: `prepareEmbedShell` preserves the native shell shape and mounts BLP under `.markdown-embed-content`.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1600` to `1647`: `attachHostRemeasure` remains a possible residual drift contributor and must be covered by CDP acceptance.
- `src/features/inline-edit-engine/InlineEditEngine.ts:1657` to `1848`: the proposed gated block is narrowly located after range annotation dispatch and before final host measure.
- `node_modules/obsidian/obsidian.d.ts:2536`: `Editor.scrollIntoView(range, center?)` is an explicit scroll API.
- `node_modules/@codemirror/view/dist/index.d.ts:828` to `835`: `requestMeasure` schedules layout measurement.
- `node_modules/@codemirror/view/dist/index.d.ts:1065` to `1070`: `EditorView.scrollIntoView` creates a scroll effect.

Implementation must run:

- `corepack pnpm test -- src/features/inline-edit-engine`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`
- `corepack pnpm run agent:workflow-check`

Implementation CDP acceptance must include:

- Fixed-port Obsidian runtime on `19225`, following `docs/agent/cdp-validation.md`.
- A scroll-stability probe or promoted snippet showing passive `mountInlineEmbedCore` no longer emits plugin-origin `editor.scrollIntoView` or `cm.dispatch.scrollIntoView` stacks.
- A no-user-input passive-mount assertion that host visible content and/or `scrollTop` remains stable within a small tolerance.
- A scroll-while-enabled assertion that requested scroll positions do not settle with large mount-correlated jumps like the accepted investigation/review probes.
- A click/focus assertion showing the embedded editor becomes usable after passive mount without unexpected host scroll movement.
- Existing regressions:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"`
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"` if lifecycle or timing changes beyond the gated reveal block.

## Risks / Open Questions

- Android/mobile remains unvalidated. Do not claim exact Android 13 parity until mobile validation or reporter-video inspection is available.
- Residual host drift from measure/layout work may remain after passive reveal calls are removed. Treat that as a validation failure or a reason to return to design, not as permission to broaden the patch silently.
- Click/focus readiness is the main behavior risk from removing passive cursor initialization.
- The native jump affordance has recent regression history, so the jump-affordance CDP snippet is mandatory after implementation.

## Decision

Accepted. Proceed to implementation with the narrow first patch: passive Live Preview inline-edit mounts must stop issuing embedded-editor selection/reveal side effects, while non-passive outliner behavior and native embed shell ownership stay unchanged.

Only the accepted first patch exits this review. A host scroll guard is not accepted as part of the first implementation unless new post-patch CDP evidence is brought back through design/review or the implementation stage records a clearly bounded stop-and-escalate result.
