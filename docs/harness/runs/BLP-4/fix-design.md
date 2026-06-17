## Status

- State: Fix Design
- Verdict: ready-for-review
- Start git status: `?? docs/agent/runs/BLP-4/`
- End git status: `?? docs/agent/runs/BLP-4/`
- Artifact validation: `corepack pnpm run agent:workflow-check` passed.
- Code changes: no product source, tests, generated files, CDP snippets, package metadata, or OpenSpec specs were edited.

## Plane Reply

Recommended implementation shape: make observer-driven Live Preview inline-edit embed mounts stop issuing embedded-editor selection/reveal side effects. The first patch should gate the `setCursor` / `scrollIntoView(..., true)` block in `InlineEditEngine.mountInlineEmbedCore` so it does not run for passive `origin: "live-preview"` mounts.

This revision intentionally removes the earlier first-patch host scroll preservation guard. A guard that restores scroll during touch/wheel/inertial scrolling is easy to get wrong on Android, and the accepted runtime stacks point first to explicit passive reveal calls. After removing those calls, implementation must rerun CDP. If measurable no-input scroll drift remains, that is the point to add an input-aware guard or return to design with fresh evidence.

The design reviewer should attack two points: whether removing passive selection/reveal is enough without a guard, and whether click/focus into the embedded editor remains usable after passive cursor initialization is removed.

## RCA Inputs Used

- Source issue: `docs/agent/runs/BLP-4/context/source-issue.md` reports Android 13 scrolling through a note with embeds repeatedly jumps back to the initial place.
- Tracker context: `docs/agent/runs/BLP-4/context/issue-context.json` marks the task `cdp-required`.
- Investigation: `docs/agent/runs/BLP-4/investigation.md` confirmed Desktop CDP host scroll displacement while BLP inline-edit embeds mounted, with stacks through `InlineEditEngine.mountInlineEmbedCore`.
- RCA review: `docs/agent/runs/BLP-4/rca-review.md` accepted the owner layer as `src/features/inline-edit-engine/InlineEditEngine.ts`, especially passive `mountInlineEmbedCore` work plus host remeasure.
- Fix-design review: `docs/agent/runs/BLP-4/fix-design-review.md` rejected the prior design because the proposed scroll guard canceled on scroll events instead of user-input signals and left click/focus behavior too implicit.
- Source inspected:
  - `src/features/inline-edit-engine/InlineEditEngine.ts:162` to `188`: outliner calls `mountInlineEmbedCore(..., { requireLivePreview: false, origin: "outliner" })`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:983` to `1115`: Live Preview observer queues `.internal-embed.markdown-embed` nodes and calls `processInlineEmbed`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1600` to `1647`: `attachHostRemeasure` schedules host CodeMirror `requestMeasure()`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1649` to `1655`: Live Preview calls `mountInlineEmbedCore(..., { requireLivePreview: true, origin: "live-preview" })`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1657` to `1848`: `mountInlineEmbedCore` prepares the shell, creates/reparents the embedded view, requests embedded/host measures, sets cursor, and calls `scrollIntoView(..., true)`.
  - `src/features/inline-edit-engine/InlineEditEngine.ts:1531` to `1598`: `prepareEmbedShell` mounts BLP's host inside `.markdown-embed-content` without detaching the native shell.
- Existing behavior/specs inspected:
  - `openspec/specs/inline-editing-embeds/spec.md`: inline edit embeds must preserve the native `.markdown-embed-link` and route hotkeys/commands to the focused embed editor.
  - `openspec/changes/archive/2026-06-12-fix-inline-edit-embed-jump-affordance/design.md`: BLP should preserve Obsidian's top-level jump link and not synthesize or relocate it.
  - `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`: runtime regression for native jump affordance preservation.
- Framework/API behavior inspected:
  - `node_modules/obsidian/obsidian.d.ts:2536`: Obsidian `Editor.scrollIntoView(range, center?)` is an explicit scroll API.
  - `node_modules/@codemirror/view/dist/index.d.ts:760`: `EditorView.scrollDOM` is the editor scroll element.
  - `node_modules/@codemirror/view/dist/index.d.ts:1070`: CodeMirror `EditorView.scrollIntoView` creates a scroll effect.

## Problem Boundary

In scope:

- Confirmed sub-bug: passive Live Preview inline-edit embed mounting can relocate the host editor scroll position while Obsidian inserts or virtualizes embed DOM.
- Affected owner layer: `InlineEditEngine` Live Preview mount flow.
- The first implementation should apply to passive `origin: "live-preview"` mounts for block, heading, range, and file embeds when inline edit is enabled.

Out of scope:

- Disabling inline editing globally or on Android.
- Reworking Obsidian's native embed virtualization.
- Changing `.markdown-embed-link` ownership, placement, visibility, or click semantics.
- Changing File Outliner embed behavior unless a test proves the shared code path requires a small compatibility adjustment.
- Claiming full Android/mobile validation before an Android or mobile Obsidian check runs.
- Adding a host scroll preservation guard in the first patch.

## Proposed Fix

Implement a scroll-neutral passive mount path in `src/features/inline-edit-engine/InlineEditEngine.ts`.

1. Classify passive Live Preview mounts explicitly.

Add a small private helper near `mountInlineEmbedCore`, for example:

```ts
private isPassiveLivePreviewMount(opts: { requireLivePreview: boolean; origin: string }): boolean {
	return opts.requireLivePreview && opts.origin === "live-preview";
}
```

Use it at the start of `mountInlineEmbedCore` after the existing early returns:

```ts
const passiveLivePreviewMount = this.isPassiveLivePreviewMount(opts);
```

2. Keep passive mount setup intact.

Passive Live Preview mounts should still:

- parse the embed;
- call `prepareEmbedShell`;
- preserve `.markdown-embed-content` and the top-level `.markdown-embed-link`;
- create and reparent the embedded view;
- set `contentEditable`;
- run embedded `cm.requestMeasure?.()`;
- install inline-edit extensions;
- dispatch `contentRange` / `editableRange` annotations;
- keep debug fields and host `requestMeasure`.

3. Gate only the passive selection/reveal side effect.

Wrap the current `InlineEditEngine.ts:1828` to `1837` block:

```ts
if (!passiveLivePreviewMount) {
	try {
		const startLine = Math.max(0, resolvedRanges.editableRange[0] - 1);
		embed.view.editor?.setCursor({ line: startLine, ch: 0 });
		embed.view.editor?.scrollIntoView(
			{ from: { line: startLine, ch: 0 }, to: { line: startLine, ch: 0 } },
			true
		);
	} catch {
		// ignore
	}
}
```

For passive `origin: "live-preview"` mounts, this removes the BLP-owned explicit selection and reveal calls that produced `editor.scrollIntoView` and `cm.dispatch.scrollIntoView` stacks in the accepted runtime evidence. For non-passive mounts, especially `mountInlineEmbedInOutliner`, keep existing behavior unless tests expose a concrete regression.

4. Make user-initiated focus/edit readiness explicit.

Do not move the passive `scrollIntoView` call into the existing `mousedown` / `click` handler. The first implementation should keep the handler event-driven and minimal: stop propagation to protect the host editor and call `embed.view.editor?.focus()`.

Validation must prove that a user click inside an already mounted inline embed:

- focuses the embedded editor;
- leaves the active selection/caret inside the embedded editor's editable range, either through CodeMirror's normal click handling or existing editor defaults;
- does not unexpectedly move the host scroller.

If validation shows the embedded editor cannot be edited after a click, add a narrow user-interaction helper only from the click/mousedown path. That helper must:

- run only after an actual user event on the embed host, never during observer-driven mount;
- prefer CodeMirror's click-derived selection when it is already inside `editableRange`;
- set a fallback cursor only when the embedded selection is absent or outside `editableRange`;
- avoid `scrollIntoView(..., true)`; and
- include a test showing the fallback does not move the host scroller.

5. Do not add the host scroll guard in the first implementation.

The previous design's guard was too easy to make harmful because `scroll` events can be caused by the same programmatic layout/measurement drift the guard would try to correct, while Android touch and inertial scroll may not map cleanly to a single scroll event.

Implementation should first remove passive selection/reveal, run the targeted tests and CDP acceptance below, and record whether drift remains. If CDP still shows large no-input host displacement after plugin-origin `scrollIntoView` stacks are gone, implementation should stop with evidence or add a second, explicitly input-aware patch only if the reviewer accepts it.

Fallback guard requirements, if fresh evidence makes one necessary:

- Resolve the host scroller from `(opts.hostView?.editor?.cm as any)?.scrollDOM`, falling back to `opts.hostView?.containerEl.querySelector(".cm-scroller")` only if needed.
- Snapshot `{ scrollTop, scrollLeft }` immediately before `prepareEmbedShell(embedEl)` for passive Live Preview mounts only.
- Treat user intent as explicit input, not scroll movement. Cancellation signals should include capture-phase `wheel`, `touchstart`, `touchmove`, `pointerdown`, and keyboard navigation events on the host editor/scroller window during the guard window. A plain `scroll` event may be logged but must not cancel by itself.
- Protect only the passive mount window: `prepareEmbedShell`, `createEmbedLeaf`, `leaves.reparent`, embedded editor setup, annotation dispatch, embedded/host `requestMeasure`, and at most the immediate next animation frame plus the existing short `attachHostRemeasure` timeout turn.
- Restore only when no user-input cancellation signal occurred, the scroller is still connected, and the delta exceeds a small noise threshold.
- Disarm after the bounded restore checks. Do not install a long-lived scroll lock.

## Alternatives Considered

- Add the host scroll preservation guard in the first patch.
  - Rejected for this revision. The design review correctly identified that a guard can either cancel itself on programmatic layout scrolls or fight real Android/touch scrolling. The direct explicit reveal calls should be removed and measured first.

- Only preserve host `scrollTop` while keeping passive `setCursor` / `scrollIntoView`.
  - Rejected. This fights the explicit scroll commands captured in the accepted stacks instead of removing the BLP-owned cause.

- Debounce all Live Preview inline-edit mounting until scrolling stops.
  - Rejected for the first patch. It changes when embeds become editable, can leave native previews visible while scrolling, and still leaves passive mount reveal work waiting at the end of the debounce.

- Disable inline edit on Android/mobile.
  - Rejected. It is too broad, removes shipped functionality, and the accepted RCA proves a BLP-owned mount side effect that should be fixed directly.

- Replace Obsidian's native `.markdown-embed-link` with a BLP-owned jump button.
  - Rejected. Current specs and the archived issue #35 design require preserving Obsidian's native top-level jump affordance and relying on Obsidian for click/touch navigation semantics.

- Remove `attachHostRemeasure`.
  - Rejected as the first patch. It may be part of the race, but it also stabilizes embedded editor layout. Remove the explicit passive reveal calls first, then use CDP to decide whether remeasure needs separate treatment.

## Implementation Notes

Expected source change:

- `src/features/inline-edit-engine/InlineEditEngine.ts`

Expected tests:

- Add focused tests under `src/features/inline-edit-engine/__tests__/`, likely in a new `InlineEditEngine.mount-scroll.test.ts` or a closely related inline-edit engine test file.
- Existing tests already access private helpers with `(engine as any)`, so testing the private mount path is acceptable in this repo.

Patch sequence for the implementation agent:

1. Add `isPassiveLivePreviewMount`.
2. Compute `passiveLivePreviewMount` in `mountInlineEmbedCore`.
3. Gate only the `setCursor` / `scrollIntoView(..., true)` block for passive Live Preview mounts.
4. Keep non-passive outliner behavior unchanged.
5. Keep the current host focus listener minimal; do not synthesize passive cursor or reveal during mount.
6. Add tests, then run CDP before considering any fallback guard.

Targeted unit tests:

- Passive Live Preview mount does not call the embedded editor's `setCursor` or `scrollIntoView`.
- Passive Live Preview mount still dispatches inline-edit range annotations and mounts/reparents the embedded root/host.
- Non-passive outliner mount still calls the embedded editor's existing selection/reveal path, unless the implementation records a deliberate narrower compatibility change.
- A click or mousedown after passive mount focuses the embedded editor and leaves a usable embedded selection without host scroll movement. If a fallback user-interaction cursor helper is added, test that it runs only from the user event path and never from passive mount.
- Existing embed-shell tests keep proving the native top-level `.markdown-embed-link` remains connected and visible.

CDP acceptance:

- Promote or rerun the investigation/review scroll probe as an implementation-time snippet if allowed by the implementation stage, for example `scripts/cdp-snippets/inline-edit-embed-scroll-stability.js`.
- Instrument `editor.scrollIntoView` and CodeMirror dispatch scroll effects. During passive Live Preview mount, plugin-origin stacks from `mountInlineEmbedCore` must no longer emit `editor.scrollIntoView` or `cm.dispatch.scrollIntoView`.
- In a no-user-input passive-mount scenario at a known host scroll position, assert host visible content remains stable across passive mount completion. Use a small tolerance for fractional `scrollTop`, and prefer a visible-block marker assertion for the main pass/fail signal.
- In a scroll-while-enabled scenario, assert requested scroll positions do not settle with large mount-correlated jumps like the accepted RCA/review probes showed.
- Validate user interaction by clicking inside an inline embed after passive mount and confirming the embedded editor receives focus without an unexpected host scroll jump.
- Rerun:
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-jump-affordance.js"`
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-bottom-padding.js"`
  - `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/inline-edit-embed-leaf-switch-remount.js"` if mount timing or lifecycle behavior changes beyond the gated reveal block.

## Validation Plan

Before implementation:

- No product validation is claimed by this design artifact.

During implementation:

- `corepack pnpm test -- src/features/inline-edit-engine`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`

CDP/runtime:

- Ensure dependencies/build first if not already current:
  - `corepack pnpm install --frozen-lockfile`
  - `corepack pnpm run build-with-types`
- Use the fixed runtime:
  - `$env:OB_CDP_PORT='19225'`
  - `$env:OB_CDP_TITLE_CONTAINS=' - blp - '`
  - `node scripts/obsidian-cdp.js list`
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225` if the fixed runtime is not already the BLP debug runtime
- Run the scroll stability probe or promoted snippet.
- Run the existing inline-edit CDP regressions listed above.
- End with `corepack pnpm run agent:workflow-check`.

Manual/mobile:

- Android or mobile Obsidian validation remains required before claiming the reporter's exact Android 13 pattern is fully fixed.
- If video tooling is available later, inspect `20260527_023622_001.mp4` for exact jump direction/frequency and compare against the post-fix mobile behavior.

## OpenSpec Gate

No OpenSpec proposal is required for this design. The change restores intended behavior for existing inline-edit embeds: observer-driven passive mounting should not relocate the host note while the user scrolls or while Obsidian virtualizes embeds.

OpenSpec checks performed:

- `openspec list` showed only existing complete changes.
- `openspec list --specs` confirmed the current `inline-editing-embeds` spec exists.
- `openspec/specs/inline-editing-embeds/spec.md` already covers preserving the native jump affordance and focused embedded editor command routing, which this design keeps intact.

If design review decides that "passive inline-edit mounts must be scroll-neutral" should become an explicit product requirement rather than a bug-restoration expectation, add a small `inline-editing-embeds` spec delta before implementation. Otherwise proceed without OpenSpec.

## Risks / Open Questions

- Android/mobile remains unvalidated. Desktop CDP proves BLP-owned host scroll displacement, but Android viewport, touch scroll, and Obsidian mobile virtualization may amplify or alter the symptom.
- Removing passive cursor initialization may expose a latent edit-readiness issue if embedded editors rely on mount-time cursor placement. This design makes click/focus validation mandatory.
- `attachHostRemeasure` may still contribute to layout drift after passive reveal calls are removed. If CDP still shows no-input drift, do not silently ship; use the fallback guard requirements above or return to design with the new evidence.
- The GitHub video was not frame-inspected in the accepted RCA. Exact visual matching remains a follow-up, not a blocker for this bounded fix.

## Decision

Ready for fix-design review.

Proceed with a minimal first implementation in `InlineEditEngine` that:

- makes passive Live Preview inline-edit mount skip embedded editor `setCursor` / `scrollIntoView`;
- preserves non-passive outliner mount behavior;
- keeps the native `.markdown-embed-link` untouched;
- does not add a host scroll guard unless post-change CDP proves residual no-input drift after plugin-origin reveal stacks are gone;
- validates user click/focus readiness explicitly; and
- validates with targeted unit tests, full tests/build, CDP scroll stability, and existing inline-edit jump-affordance/layout regressions.
