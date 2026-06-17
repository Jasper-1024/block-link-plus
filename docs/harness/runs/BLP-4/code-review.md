## Status

- Verdict: accepted
- Task: BLP-4 / GitHub #36, Android embed scrolling jumps back to initial position.
- Reviewer scope: adversarial code review only. No product source, tests, generated files, CDP snippets, package metadata, or OpenSpec specs were edited by this review.
- Implementation artifact verdict checked: `ready-for-review`.
- Review git status before artifact: `M scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`; `M src/features/inline-edit-engine/InlineEditEngine.ts`; `?? docs/agent/runs/BLP-4/`; `?? src/features/inline-edit-engine/__tests__/InlineEditEngine.mount-scroll.test.ts`.

## Plane Reply

Accepted. The implementation matches the accepted first-patch design: passive Live Preview inline-edit embed mounts skip embedded-editor `setCursor` and `scrollIntoView(..., true)`, while outliner/non-passive mounts keep the prior reveal behavior. The patch does not add the rejected host scroll guard.

Validation is sufficient for human review: the implementation recorded full Jest, build-with-types, fixed-port CDP scroll stability, click/focus, jump-affordance, bottom-padding, and leaf-switch remount checks; this review also reran the focused inline-edit Jest suite successfully.

Remaining risk is the already documented one: Android/mobile Obsidian was not validated, and the post-fix passive-mount probe still showed a small numeric `scrollTop` adjustment with stable visible content. That does not block this narrow patch.

## Review Summary

Reviewed the required stage inputs, the accepted RCA/design chain, current git status, the source diff, the CDP snippet diff, and the new focused test file.

The changed source is tightly scoped to `InlineEditEngine.mountInlineEmbedCore`. It adds a passive Live Preview classifier and uses it only to gate the existing cursor/reveal block. Shell preparation, embedded leaf creation/reparenting, range annotations, requestMeasure behavior, host remeasure, event listeners, debug fields, and native `.markdown-embed-link` ownership remain in place.

The CDP snippet adjustment from `textContent` to `innerText ?? textContent` is acceptable. The regression is about visible system-tail leakage and native jump-link behavior; hidden native preview DOM can still contribute to `textContent`, and other current CDP snippets already use visible text for this assertion.

## Findings

No blocking findings.

No code path in the diff contradicts the accepted design, broadens the patch into a scroll guard, changes transaction filtering/range-maintenance semantics, or touches unrelated feature behavior.

## Design Compliance

- Compliant: passive Live Preview mounts are identified as `requireLivePreview && origin === "live-preview"`.
- Compliant: only the embedded editor `setCursor` / `scrollIntoView(..., true)` block is skipped for passive mounts.
- Compliant: `mountInlineEmbedInOutliner` still calls the core path with `requireLivePreview: false` and `origin: "outliner"`, so outliner reveal behavior is preserved.
- Compliant: native embed shell ownership is not changed; the patch does not relocate or replace `.markdown-embed-link`.
- Compliant: no host scroll preservation guard was added.
- Compliant: existing `filter:false` range annotation dispatch remains unchanged.

## Test And Validation Review

Reviewed implementation evidence:

- `corepack pnpm test -- src/features/inline-edit-engine`: passed.
- `corepack pnpm test`: passed.
- `corepack pnpm run build-with-types`: passed.
- Fixed-port Obsidian/CDP runtime started on `19225` and loaded BLP `2.0.15`.
- `.tmp/BLP-4/issue36-inline-mount-instrumented.js`: passed with no plugin-origin scrollIntoView events and stable visible content.
- `.tmp/BLP-4/issue36-scroll-while-enabled-review.js`: passed with no plugin-origin scrollIntoView events and much smaller settled deltas than pre-fix evidence.
- `.tmp/BLP-4/issue36-click-focus-postfix.js`: passed with embedded focus and no host scroll delta.
- Existing CDP regressions for jump affordance, bottom padding, and leaf-switch remount passed.
- `corepack pnpm run agent:workflow-check`: passed in implementation.

Review-side validation run:

- `corepack pnpm test -- src/features/inline-edit-engine`: passed, 6 suites / 15 tests.

The new Jest coverage checks the important local contracts: passive mount skips cursor/reveal, passive mount still dispatches inline-edit annotations and requests measures, outliner mount keeps cursor/reveal, and mousedown after passive mount focuses without reintroducing cursor/reveal calls.

## Required Revisions

None.

## Risks / Open Questions

- Android/mobile Obsidian remains unvalidated. The accepted RCA/design already allowed Desktop CDP as the repo runtime gate while keeping exact Android parity as residual risk.
- The passive-mount CDP probe still observed a small numeric `scrollTop` change while scroll height changed. The visible marker stayed stable and plugin-origin reveal stacks were removed, so this does not justify adding the rejected guard in this patch.
- If reporter-visible jumps persist after this patch on Android, the next design should revisit host remeasure/layout drift using post-fix evidence rather than silently extending this implementation.

## Decision

Accepted for human review or merge decision within the accepted scope.
