# Block Link Plus Issue Triage - 2026-06-12

This is a temporary investigation note for the recent GitHub issue review and
the follow-up runtime debugging session against Obsidian CDP port 9224.

## Sources

- GitHub issues reviewed:
  - #33: Inline Editing Instability For Embedded Block
  - #34: Toggle/Option to escape pipe character in block links with alias
  - #35: Show arrow icon on embed
  - #36: Scrolling position jumps back while scrolling notes with embeds
- Obsidian runtime:
  - Vault: `blp`
  - Base path: `C:\Users\stati\Git\blp\blp`
  - Obsidian: `1.12.7`
  - CDP target title: `split-root-cause-probe - blp - Obsidian 1.12.7`
  - Plugin version: `2.0.15`

## Runtime Repro Notes

Temporary vault notes created or reused during debugging:

- `_blp_tmp/issue-inline-source.md`
- `_blp_tmp/issue-inline-host.md`
- `_blp_tmp/issue-scroll-host.md`
- `_blp_tmp/outliner-search-jump.md`

These are in the Obsidian debug vault, not in this plugin repository checkout.

## Issue Classification

| Item | Type | Severity | Fix difficulty | Confidence | Main area |
| --- | --- | --- | --- | --- | --- |
| #33 inline edit instability | Bug cluster | High | High | Confirmed for undo overflow and bottom padding | Inline Edit Engine / CM6 selective ranges |
| #34 escaped pipe in alias | Feature/compat request | Low-Medium | Low-Medium | Static-confirmed missing option | Link generation / clipboard alias handling |
| #35 missing embed arrow | Bug despite FR title | Medium | Medium | Runtime-confirmed | Inline Edit DOM takeover |
| #36 scroll jumps | Bug | High | Medium-High | Runtime-confirmed on desktop; Android risk higher | Inline Edit mount / scroll anchoring |
| Android display freeze | Bug/perf risk | High | Unknown | Not directly testable here | Inline Edit mobile performance |
| Search click cannot jump to Outliner row | Bug | Medium-High | Medium | Runtime-confirmed | File Outliner routing / ephemeral state |

## Confirmed Findings

### Priority fix now selected: Outliner search result jump

This is the first fix target.

- Change id: `fix-file-outliner-search-line-jump`
- Reason: runtime reproduction is clear, likely root cause is isolated to File
  Outliner ephemeral navigation state, and the expected fix has a narrow blast
  radius.
- Validation requirement: reproduce and verify through the real Obsidian CDP
  debug environment on port `9224`, not only through unit tests.
- Test requirement: add a regression test for mapping Obsidian line-oriented open
  state to an Outliner block id.

Implementation result:

- Added source-line to Outliner block id mapping.
- `FileOutlinerView.setEphemeralState()` now preserves subpath-first navigation
  and falls back to line-oriented navigation.
- Review fix: source-line mapping now uses parser-owned source line metadata so
  legacy tail-after-children files map child search hits to the child block
  instead of the parent.
- Added targeted Jest coverage for body lines, continuation lines, system tail
  lines, frontmatter offset, legacy tail-after-children layout, and line-state
  extraction.
- Added CDP regression snippet:
  `scripts/cdp-snippets/file-outliner-search-line-jump.js`.

Verification result:

- `openspec validate fix-file-outliner-search-line-jump --strict`: passed.
- `npm test -- --runInBand src/features/file-outliner-view/__tests__/source-line-navigation.test.ts src/features/file-outliner-view/__tests__/protocol.test.ts`: passed.
- `npm run build-with-types`: passed.
- CDP 9224 live Obsidian validation: passed with `{ ok: true, targetLine: 93,
  targetId: "s045", legacyTargetLine: 144, legacyTargetId: "legacy-child" }`.

### #35: Native embed jump arrow disappears

Runtime result:

- In Live Preview, both inline-edit embeds had `blp-inline-edit-active`.
- Page-level `.markdown-embed-link` count was `0`.
- Each active embed had no native `.markdown-embed-link`.

Focused CDP investigation after reloading current build:

- Current repo `HEAD`: `1fc36441ad84188138fb54caf707c53cdd9ec64d`.
- Repo `main.js` SHA256 matched debug vault plugin `main.js` SHA256:
  `EBE44FE68288775B3C6D54BDFCA13745865B15EAB2064E7959DD496FC19F0775`.
- CDP target: Obsidian `1.12.7`, vault `blp`, plugin version `2.0.15`.
- The investigation disabled and re-enabled `block-link-plus` through CDP before
  reproducing, so the in-memory plugin instance was loaded from the current
  debug vault build.

Controlled repro:

- Source note: `_blp_tmp/issue35-arrow-source.md`.
- Host note: `_blp_tmp/issue35-arrow-host.md`.
- With the plugin disabled, the native embed had:
  - `embedCount: 1`
  - `activeInlineCount: 0`
  - `pageLinkCount: 1`
  - embed-local `linkCount: 1`
- Clicking the native `.markdown-embed-link` with the plugin disabled navigated
  to `_blp_tmp/issue35-arrow-source.md`.
- With the plugin re-enabled and inline edit active, the same embed had:
  - `embedCount: 1`
  - `activeInlineCount: 1`
  - `pageLinkCount: 0`
  - embed-local `linkCount: 0`
  - `hostCount: 1`
  - `rootCount: 1`

Confirmed cause:

- `InlineEditEngine.prepareEmbedShell()` detaches native `.markdown-embed-content`
  and `.markdown-embed-link` when replacing the native preview with the detached
  inline editor host.
- This conflicts with the inline editing spec requirement that the Obsidian
  embed jump/open affordance remains available.
- Runtime monkeypatching of `Element.detach`, `Element.remove`, and
  `Node.removeChild` captured the exact BLP stack for the target repro:
  - `detachNative`
  - `scanAndDetach`
  - `InlineEditEngine.prepareEmbedShell`
  - `InlineEditEngine.mountInlineEmbedCore`
  - `InlineEditEngine.processInlineEmbed`
  - `InlineEditEngine.processObserverEntry`
- The first removal is not CSS hiding. The `.markdown-embed-link` element is
  physically detached from the DOM by `detachNative(currentLink)`.
- The `MutationObserver` inside `prepareEmbedShell()` also calls
  `scanAndDetach()`, so if Obsidian recreates native embed content/link after
  inline edit starts, BLP detaches it again.

Likely fix direction:

- Preserve or re-create a working jump affordance for active inline-edit embeds.
- Keep the affordance outside the editor takeover host so it is not swallowed by
  the embedded editor DOM.

Implementation result:

- OpenSpec change: `fix-inline-edit-embed-jump-affordance`.
- OpenSpec archive: `openspec/changes/archive/2026-06-12-fix-inline-edit-embed-jump-affordance`.
- Review fix: changed the OpenSpec delta from a full `MODIFIED` requirement to
  an independent `ADDED` requirement so archiving appends readable jump-affordance
  behavior instead of replacing the existing inline-edit requirement text.
- Refactored `InlineEditEngine.prepareEmbedShell()` so BLP preserves the native
  top-level `.markdown-embed-link`.
- The inline editor host now mounts inside the native `.markdown-embed-content`
  wrapper; BLP hides native preview children through CSS instead of detaching the
  Obsidian-owned shell.
- Cleanup removes only BLP host state and the `blp-inline-edit-active` class.
- CSS now allows the top-level native `.markdown-embed-link` while inline edit is
  active.
- Added Jest DOM regression coverage for native link preservation, cleanup,
  nested preview links, and later-added native links.
- Added CDP regression snippet:
  `scripts/cdp-snippets/inline-edit-embed-jump-affordance.js`.

Verification result:

- `openspec validate fix-inline-edit-embed-jump-affordance --strict`: passed.
- `openspec validate --changes --strict`: passed.
- Targeted inline-edit Jest: passed.
- Full Jest `npm test -- --runInBand`: passed, 37 suites / 212 tests.
- `npm run build-with-types`: passed.
- Repo `main.js` SHA256 matched debug vault plugin `main.js` SHA256 after build:
  `3591F8EADA69BA1C76EA05E8F14DDE487E8607E48D249951E468568874...`.
- CDP 9224 live validation passed:
  - Plugin disabled baseline native link clicked to `_blp_tmp/issue35-arrow-source.md`.
  - Plugin enabled inline edit had one active embed, one page link, one direct
    native link, one host, one root, and `linkVisible: true`.
  - Clicking the active inline-edit native link navigated to source.
  - Remount kept exactly one native link and one host.
  - Inline-edit embed text did not expose `blp_sys` or `blp_ver`.

### #33: Enter then Ctrl+Z causes inline-edit overflow

Runtime repro:

1. Open `_blp_tmp/issue-inline-host.md` in Live Preview.
2. Inline edit mounts `![[issue-inline-source#^alpha1]]`.
3. Focus the first embed editor at the end of `Alpha child two`.
4. Press `Enter`.
5. Press `Ctrl+Z`.

Observed:

- Before Enter:
  - Embed height: about `97px`
  - CM doc lines: `16`
  - Visible range: `[5, 8]`
  - Editable range: `[5, 8]`
- After Enter:
  - Embed height: about `124px`
  - CM doc lines: `17`
  - Cursor moved to the inserted list item.
- After Ctrl+Z:
  - Source text returned to original content.
  - CM doc lines returned to `16`.
  - Embed height incorrectly grew to about `145px`.
  - Visible DOM leaked the next paragraph: `Paragraph block for regular embed ^para1`.

Interpretation:

- This is not permanent source corruption.
- The visible CM DOM/range hiding layer gets out of sync after undo.
- A no-op dispatch plus `requestMeasure()` did not restore the hidden range, so
  the fix likely needs explicit range/decorations re-synchronization after undo
  or a more robust range state update path.

### #33: Persistent blank padding at the end of editable embed

Runtime result:

- Active inline-edit embeds had computed `.cm-content` `padding-bottom: 18px`.
- This directly matches the reported persistent blank padding.

Cause:

- `src/css/Editor/InlineEdit/InlineEditEngine.css` sets fixed bottom padding on
  `.blp-inline-edit-root .cm-content`.

Fix:

- Removed the fixed bottom padding from the inline edit embedded editor content
  by setting `.blp-inline-edit-root .cm-content` `padding-bottom` to `0`.
- Added a CSS regression test and a CDP runtime check for the computed
  `.cm-content` `padding-bottom`.
- This fixes only the persistent blank padding sub-issue, not the broader #33
  overflow/lifecycle symptoms.

### #33: Reading View displays too much source

Runtime status:

- Not reproduced in the minimal host/source note.
- Reading View rendered the visible block/range content correctly.
- However, after mode switching, duplicate old embed DOM shells existed with
  `0x0` geometry.

Interpretation:

- The exact "entire source text" report may require the user's original note
  shape or a different Obsidian render timing.
- The 0x0 duplicate DOM shells are suspicious cleanup residue but were not
  visibly harmful in the minimal repro.

### #36: Scroll position jumps in notes with embeds

Runtime repro:

1. Open `_blp_tmp/issue-scroll-host.md`.
2. The note contains 15 repeated block embeds.
3. Programmatically set the host `.cm-scroller.scrollTop` in steps and wait for
   lazy embed mounting.

Observed:

- Setting `scrollTop = 0` later became about `780`.
- Setting `scrollTop = 600` later became about `1623`.
- Active inline roots increased as scrolling/rendering progressed.

Instrumentation:

- Runtime patch traced `EmbedLeafManager.createEmbedLeaf()`.
- Each inline embed creates a detached MarkdownView/WorkspaceLeaf.
- The explicit embedded editor `setCursor()` / `scrollIntoView()` calls did not
  directly change host scrollTop in the trace.

Interpretation:

- The jump is likely caused by inline editor mount/layout height changes plus
  browser/CodeMirror scroll anchoring, not just the explicit `scrollIntoView()`
  call.
- This also supports the Android freeze risk: many inline embeds can mount many
  full editor leaves while the user scrolls.

### Android display freeze

Runtime status:

- Not directly testable in the current desktop CDP environment.

Risk assessment:

- High risk because desktop already shows heavy inline embed mounting and scroll
  instability with many embeds.
- Android likely has lower layout/editor performance headroom.

Likely fix direction:

- Add mobile-specific mitigation or lazy/activation-based inline edit mounting.
- Avoid eagerly replacing every visible embed with a full detached MarkdownView.

### Outliner search result click does not jump to row

Runtime repro:

1. Created `_blp_tmp/outliner-search-jump.md` with 60 outliner blocks.
2. Target block: `^s045`, containing `TARGET_NEEDLE`.
3. Simulated search-like open state:
   - `eState: { line, startLoc, endLoc }`
4. Simulated block-link open state:
   - `eState: { subpath: "#^s045", line, startLoc, endLoc }`

Observed:

- With `line/startLoc/endLoc` only:
  - View type: `blp-file-outliner-view`
  - `scrollTop = 0`
  - Target block was outside the viewport.
- With `subpath: "#^s045"`:
  - View type: `blp-file-outliner-view`
  - `scrollTop` moved to about `830`
  - Target block was visible.

Likely cause:

- `registerFileOutlinerRouting()` routes enabled markdown files into the custom
  Outliner view with view state `{ file: file.path }`.
- `FileOutlinerView.setEphemeralState()` only extracts a block id from
  `state.subpath`.
- Obsidian search result clicks appear to provide line-oriented state
  (`line/startLoc/endLoc`) instead of a block subpath, so Outliner ignores it.

Likely fix direction:

- Preserve open state through routing.
- In `FileOutlinerView.setEphemeralState()`, support line-oriented state by
  mapping the target source line to the corresponding Outliner block id, then
  scroll to that block.

## Suggested Fix Order

1. Fix Outliner search result jump. FIRST FIX TARGET.
   - High confidence, bounded area, clear runtime repro.
   - OpenSpec change: `fix-file-outliner-search-line-jump`.
   - Must be verified through the real Obsidian CDP environment on port `9224`.
2. Fix #35 native embed jump arrow.
   - High confidence, clear DOM cause.
3. Fix #33 undo overflow and bottom padding.
   - Confirmed, but the range/decorations fix needs care.
4. Fix #36 scroll instability and Android freeze risk together.
   - Treat as inline-edit mount/lifecycle/performance work.
5. Add #34 pipe escaping option.
   - Small compatibility enhancement; lower urgency than confirmed breakages.

## Notes For Later Tests

- Add a CDP or unit regression for Outliner `setEphemeralState({ line })`.
- Add a DOM/runtime regression for inline-edit active embeds preserving a jump
  affordance.
- Add a CM6-focused regression for undo after newline in a selective inline edit
  range.
- Add a long-note CDP smoke for scroll position stability around repeated embeds.
