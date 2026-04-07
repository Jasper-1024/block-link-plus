# Journal Feed Runtime Debug Log

Goal: confirm whether we can build a Logseq-like continuous Journal Feed view in Obsidian by embedding multiple Markdown editors, while preserving focus + command routing (BLP shortcuts, parsing, "current file" assumptions).

Environment:
- Obsidian started with `--remote-debugging-port=9223` (user provided).
- Repo: `block-link-plus`.

Status: in progress.

## Open Questions
- Can a "detached/internal" MarkdownView become effectively "active" for editor commands and BLP features when focused?
- If not, can we bridge focus by setting `workspace.activeLeaf` (or similar) without breaking workspace UX?
- Which BLP features depend on active leaf/editor, and can we adapt them to accept an explicit leaf/editor context?

## Findings (Chronological)
### 2026-04-06
- CDP connect to `127.0.0.1:9223` failed: nothing is listening on that port.
- `127.0.0.1:9222` is listening, but it is owned by `chrome.exe` (Helium), not Obsidian.
- The running Obsidian main process command line does not include `--remote-debugging-port=...`.
- Starting a second Obsidian instance with `--remote-debugging-port=9223` while Obsidian is already running does not open the port (likely single-instance lock ignores the flag).
- Conclusion: to use CDP we must fully restart Obsidian with `--remote-debugging-port=<port>` as the first instance.

- Codebase evidence: BLP already solved "focused internal editor should receive commands" for Inline Edit embeds:
  - `InlineEditEngine` patches `app.commands.executeCommand` to route editor commands to the currently focused internal embed leaf/view/editor.
  - It also patches `workspace.getActiveViewOfType` and the `workspace.activeLeaf` getter during command routing.
  - This implies Journal Feed can likely reuse the same mechanism, instead of trying to force internal leaves to become workspace-active.
  - References:
    - `src/features/inline-edit-engine/InlineEditEngine.ts` (command routing + activeLeaf patch)
    - `src/features/inline-edit-engine/FocusTracker.ts`
    - `src/features/inline-edit-engine/EmbedLeafManager.ts` (detached markdown leaf creation)

### 2026-04-07
- Confirmed CDP works on `127.0.0.1:9223` and targets the Obsidian renderer.
- Vault base path is `C:\\Users\\stati\\Git\\blp\\blp` (not the plugin repo).
- Created debug notes in-vault via CDP:
  - `__journal-feed-debug__/focus-a.md`
  - `__journal-feed-debug__/focus-b.md`
- Hard proof: editor command routing can be made to target an embedded/detached MarkdownView.
  - Setup: normal workspace active file stays `focus-a.md`, but we mount `focus-b.md` as an internal embedded editor by calling `BlockLinkPlus.inlineEditEngine.leaves.createEmbedLeaf(...)` into a custom host div.
  - Action: execute `app.commands.executeCommandById('block-link-plus:copy-link-to-block')`.
  - Result: clipboard write captured as `[[focus-b#^...]]` (i.e. the embedded leaf's file), even though `workspaceActiveFile` remained `focus-a.md`.
  - This confirms the core requirement is feasible: Journal Feed can embed multiple Markdown editors AND keep BLP shortcuts bound to the focused embedded day file, without needing to force `workspace.activeLeaf` to be that internal leaf.

- Daily Notes settings access (no extra dependency needed):
  - `app.internalPlugins.getPluginById('daily-notes').instance.getFolder()` returns a folder object (TFolder-like) with `.path`.
  - `app.internalPlugins.getPluginById('daily-notes').instance.getFormat()` returns the Moment format string (e.g. `YYYY-MM-DD`).
  - `app.internalPlugins.getPluginById('daily-notes').instance.iterateDailyNotes(cb)` yields `(file, tsMs)` pairs for existing daily notes.

- Multi-editor focus switching proof:
  - Mounted three daily notes into one fixed host as embedded MarkdownViews (`2026-04-07.md`, `2026-04-06.md`, `2026-04-05.md`).
  - CDP `Input.dispatchMouseEvent` clicks on each editor correctly switch `inlineEditEngine.focus.getFocused()` to that day.
  - Running `block-link-plus:copy-link-to-block` after each click writes the link for the clicked day file (while `workspaceActiveFile` stays unchanged).

- Edit isolation proof:
  - With two embedded daily notes mounted, editing + `MarkdownView.save()` on `2026-04-07.md` does not modify `2026-04-06.md` (checked by reading both file contents).

- Inline Edit disabled still allows routing (with explicit focus set):
  - Even when `inlineEditEnabled=false` (so inline edit is inactive), the command routing patch remains installed.
  - If Journal Feed sets `inlineEditEngine.focus.setFocused({leaf, view, file, containerEl, ...})` for its own embedded leaves, BLP editor commands still route to the focused day file.

- Focus tracking nuance (CDP):
  - Programmatic `element.focus()` updates `document.activeElement`, but does not reliably emit `focusin/focusout` events in our CDP-run snippets.
  - Real input click simulation via CDP `Input.dispatchMouseEvent` does cause the InlineEditEngine focus tracker to work, and command routing works without manually calling `engine.focus.setFocused(...)`.
  - Conclusion: in Journal Feed implementation, rely on real user interaction for focus tracking, and optionally add a fallback `pointerdown/mousedown` handler on each day editor host to set the focused embed explicitly.

### 2026-04-07 (later)
- End-to-end Journal Feed smoke via CDP passed (routing + focus/commands + edit isolation):
  - Ran: `OB_CDP_PORT=9223 OB_CDP_TITLE_CONTAINS=blp node scripts/obsidian-cdp.js eval-file scripts/cdp-snippets/journal-feed-view-smoke.js`
  - Result: `{ ok: true, clipboardSamples: ["[[2026-04-07#^...]]","[[2026-04-06#^...]]"] }`
- Root cause of earlier false failures:
  - The smoke snippet was writing literal `\\n` characters into files (instead of newlines), so frontmatter parsing failed and routing never triggered.
  - The `copy-link-to-block` command intentionally treats cursor `(0,0)` as invalid (see `analyzeHeadings()`), so the smoke must set cursor to a non-zero line.

## Conclusion
- The "Journal Feed continuous daily notes view" is feasible without breaking BLP editor commands, as long as each day editor is mounted as an internal embedded MarkdownView registered with the command-routing focus mechanism (same primitive as InlineEditEngine).
- Implementation should reuse `inlineEditEngine.leaves.createEmbedLeaf(...)` (or extract it into a shared service) so `executeCommand` routing uses the focused embedded editor's `view.file` and `editor`.
- Integration constraint: InlineEditEngine currently calls `leaves.cleanup()` when inline edit is not active (on layout-change/settings-change). If Journal Feed reuses the same leaf manager, we must either:
  - keep Journal Feed independent by extracting a shared "embedded editor host + command routing" service, or
  - extend InlineEditEngine to support "external embeds" that are not cleaned up when inline edit is disabled.
