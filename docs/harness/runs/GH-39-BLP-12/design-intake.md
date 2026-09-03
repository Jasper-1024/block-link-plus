# Design Intake: BLP-12

## Status

- State: Design Intake
- Verdict: human-review-required
- Archive key: `GH-39-BLP-12`
- Source issue: [GitHub #39](https://github.com/Jasper-1024/block-link-plus/issues/39)

## Plane Reply

Human decision needed: approve or reject a bounded extension of current-note
document search (`editor:open-search`) in normal Markdown Live Preview. The
recommendation is to aggregate the host editor with BLP-owned inline-edit
embed editors, search only their visible ranges, and leave Global Search,
Reading View, and native preview embeds unchanged. The runtime proves the gap
and also exposes a hidden-range compatibility risk; details are in the
runtime trace below.

Move the item to `Review Approved` to authorize implementation routing, or to
`Review Rejected` with feedback. Keep it in `Human Review` if the command,
range, or compatibility decisions remain unresolved.

## Current Understanding

GitHub issue #39 asks for Obsidian to find text inside embedded blocks,
headings, and notes while a note is in Live Preview; the report says the same
behavior is available in Reading View. The Plane description deliberately
leaves search ownership, scope, and compatibility open. There are no GitHub
comments or prior human-review comments to reconcile.

The request most closely matches current-note document search rather than the
vault-wide Search pane: Live Preview currently has a host CodeMirror document
plus BLP-owned detached CodeMirror editors for inline embeds, while Global
Search indexes source files independently. This interpretation needs the
human decision in Question 1.

In the current plugin, the affected embed forms map to existing settings:

- `inlineEditBlock`: `![[file#^blockId]]` and range/block embeds
- `inlineEditHeading`: `![[file#Heading]]`
- `inlineEditFile`: `![[file]]` (disabled by default)

Reading View remains read-only in the existing product contract. No product
code, tests, package metadata, generated files, or formal specs were changed
for this intake.

## Repo Findings

`InlineEditEngine` is the natural ownership seam for the requested behavior:

- `InlineEditEngine.ts:957-1118` observes normal Markdown Live Preview DOM and
  mounts eligible embeds as they appear.
- `InlineEditEngine.ts:1311-1337` parses block, heading, and full-file embeds
  according to the existing settings.
- `EmbedLeafManager.ts:81-130` creates a detached `WorkspaceLeaf` with a
  `MarkdownView`; the embed surface is therefore a separate CodeMirror editor,
  not part of the host editor's document.
- `InlineEditEngine.ts:293-315` tracks focus for those managed embeds.
  `InlineEditEngine.ts:711-879` routes editor commands to the focused detached
  editor and temporarily exposes that editor as the active view/leaf while a
  command runs. This explains why search works when an embed already owns
  focus, but does not aggregate searches from a host-focused note.
- `selectiveEditor.ts:111-119`, together with the range annotations applied at
  `InlineEditEngine.ts:1795-1812`, hides source lines outside an embed's
  rendered range and hides Outliner system-tail lines. Native CodeMirror
  search still searches the full underlying document, so search scope cannot
  be assumed from the visual decorations.
- Existing tests cover inline-edit mounting/lifecycle, shell preservation,
  range hiding, and file-embed parsing, but there is no search-specific
  coordinator or regression test.

### Runtime Evidence

The task-owned CDP Runtime was checked after recovery and matched the required
identity: Obsidian `1.13.6`, vault `blp-BLP-12`, plugin
`block-link-plus@2.0.17`, title boundary `blp-BLP-12`, CDP port `19228`,
worktree branch `symphony/GH-39-BLP-12`. The durable JSON trace is
`trace/design-intake/runtime-search-baseline.json`.

The successful probes used the runner lease through these commands:

- `node scripts/obsidian-cdp.js list`
- `node scripts/obsidian-cdp.js eval-file '.tmp/GH-39-BLP-12/search-only.js'`
- `node scripts/obsidian-cdp.js eval-file '.tmp/GH-39-BLP-12/search-file-only.js'`

Important observations:

| Surface and owner | Query | Native count | What it proves |
| --- | --- | ---: | --- |
| Live Preview host editor | `gh39-block-token` | `0 / 0` | Host document search excludes text visible only in a mounted block embed. |
| Focused block inline-edit editor | `gh39-block-token` | `1 / 1` | The existing native command searches a detached embed editor when it owns focus. |
| Focused block inline-edit editor | `gh39-heading-token` | `1 / 1` | Native search crosses BLP's hidden range and matches source text outside the visible block. |
| Live Preview host with native full-note embed | `gh39-file-token` | `0 / 0` | Host search also excludes a native preview embed that BLP does not own. |
| Focused full-note inline-edit editor (`inlineEditFile=true`) | `gh39-file-token` | `1 / 1` | Full-note search works when BLP owns the detached editor and it has focus. |
| Global Search pane (`global-search:open`) | `gh39-file-token` | `1` source-file result | Global Search is a separate source-file index, not current-note embed aggregation. |

The native Reading View search surface (`MarkdownView.previewMode.search` and
`.document-search`) was present, but this runtime's preview renderer remained
at zero sections even with BLP disabled. Content-level Reading View matching
is therefore not independently proved by this run; the source issue's Reading
View statement remains an input, not a new runtime claim.

One broad exploratory probe and one scripted boundary probe each timed out at
the 60-second CDP limit with `tainted:true`; the root coordinator stopped
using the instance and recovered it with `ensure_runtime(fresh=true)`. A
wrapper probe also failed its bounded mount wait. These failures produced no
design claim. The final direct probes completed, and exact fixture cleanup
passed: the temporary files were deleted, settings restored to
`inlineEditEnabled=true`, `inlineEditBlock=true`, `inlineEditHeading=true`,
`inlineEditFile=false`, the active note was `_debug/start.md` in Live Preview,
and no managed embed or Search leaf remained.

## Discussion Questions

1. **Which Obsidian search surface does #39 change: current-note document
   search or Global Search?**

   Recommended answer: extend current-note `editor:open-search` in normal
   Markdown Live Preview only; leave `global-search:open` and its source-file
   index unchanged.

   Why it matters: the two commands have different result models. Aggregating
   Global Search would change vault-wide indexing and duplicate source-file
   results, while the reproduced defect is that a host-focused Live Preview
   editor cannot see text rendered by its embedded editors.

2. **Should the feature search only BLP-owned inline-edit surfaces, or also
   native preview embeds that BLP leaves untouched?**

   Recommended answer: search only mounted BLP-owned embed editors and honor
   `inlineEditBlock`, `inlineEditHeading`, and `inlineEditFile`; a full-note
   embed participates only when `inlineEditFile=true`.

   Why it matters: BLP has reliable ownership, focus, and lifecycle handles
   for detached CodeMirror editors. Scanning or indexing native preview DOM
   would create a second renderer/search contract and would make the default
   `inlineEditFile=false` behavior ambiguous.

3. **For block and heading embeds, should matches be limited to the visible
   rendered range or search the full underlying source document?**

   Recommended answer: search the visible range, including visible read-only
   heading or range-marker lines, while excluding hidden source lines and
   Outliner system-tail lines.

   Why it matters: the current detached editor retains the whole source note;
   runtime evidence shows native search returns `1 / 1` for a heading token
   hidden outside a block embed's displayed range. Full-document matching
   would surface text the user cannot see in that embed and could expose BLP
   maintenance tokens.

4. **How should the native search UI count and navigate matches across the
   host and repeated embed occurrences?**

   Recommended answer: use occurrence-based counts for the current rendered
   note, reuse the native document-search panel, and when the next match is in
   an embed, focus that editor and reveal the matching visible line. Repeated
   references to the same source count as separate visible occurrences.

   Why it matters: a single source note can appear in multiple embeds or
   ranges. De-duplicating by source file would make navigation jump to a
   different occurrence than the one represented in the current note.

5. **What Obsidian compatibility boundary is acceptable for the implementation?**

   Recommended answer: keep the first slice behind a narrow InlineEditEngine
   adapter for normal Markdown Live Preview, compose with the existing native
   search panel where possible, fail open to native single-editor search, and
   avoid changing Global Search or introducing a global command patch.

   Why it matters: the current solution already relies on detached
   `WorkspaceLeaf`/`MarkdownView` internals and temporary active-view routing.
   A plugin-owned aggregate search UI or a broad interception of Obsidian's
   private search internals would increase version and lifecycle risk. If that
   narrow adapter is not viable on the supported Obsidian version, the choice
   between a private native-panel integration and a plugin-owned UI needs a
   separate human decision.

## Candidate Scope

After approval, the smallest coherent implementation slice is:

- Normal Markdown `MarkdownView` in Live Preview only.
- Current-note document search initiated from the host editor, aggregating the
  host CodeMirror editor with the BLP-managed inline-edit editors mounted in
  that host.
- Block, heading, and full-note embeds only when their existing inline-edit
  settings allow BLP to own the surface.
- Visible-range matching with explicit exclusion of hidden lines and
  Outliner system-tail lines; visible read-only heading/marker text remains
  searchable.
- Native-looking count/navigation behavior that focuses and reveals a
  matching embed without changing source content.
- No behavior change when no managed embeds are present, inline edit is
  disabled, or native search cannot be extended safely; the host falls back to
  its current single-editor behavior.

Implementation routing should turn the approved choices into characterization
tests for ownership/range behavior and a CDP regression covering host search,
block/heading/file embed matches, navigation, repeated occurrences, settings
gates, and cleanup across Live Preview lifecycle changes.

## ADR Candidates

None is required for the bounded first slice as described. If human approval
requires patching Obsidian's private search implementation globally, or
introducing a plugin-owned cross-editor search protocol that becomes a long-
term command-ownership boundary, record an ADR before implementation: that
choice is surprising without context, hard to reverse, and has a real
compatibility trade-off. A narrow InlineEditEngine-local adapter does not yet
meet that ADR bar.

## Non-Goals

- Changing Global Search's vault-wide index or making source-file results list
  every embed occurrence.
- Changing Reading View search behavior or making Reading View editable.
- Searching native preview embeds that BLP does not own when the corresponding
  inline-edit setting is disabled.
- Covering File Outliner View, Journal Feed, `blp-view`, or other custom BLP
  surfaces in the first slice.
- Recursing into nested embeds; the current inline-edit contract intentionally
  skips editor-in-editor mounting.
- Search-and-replace across multiple editors or read-only visible ranges.
- Changing embed syntax, default inline-edit settings, source-file indexing,
  or Outliner metadata semantics.
