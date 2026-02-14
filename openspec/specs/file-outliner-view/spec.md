# file-outliner-view Specification

## Purpose
TBD - created by archiving change add-file-outliner-view. Update Purpose after archive.
## Requirements
### Requirement: File Outliner View is opt-in and scoped
The plugin MUST only enable the file-level Outliner View for files within the configured scope.

Scope MUST support:
- Plugin settings: enabled folders/files list
- Frontmatter override: `blp_outliner: true|false`

#### Scenario: Enabled by frontmatter outside enabled folders
- **GIVEN** a file is outside the enabled folders/files list
- **AND** its frontmatter contains `blp_outliner: true`
- **WHEN** the user opens the file
- **THEN** the file opens in the Outliner View

#### Scenario: Disabled by frontmatter inside enabled folders
- **GIVEN** a file is inside the enabled folders/files list
- **AND** its frontmatter contains `blp_outliner: false`
- **WHEN** the user opens the file
- **THEN** the file opens in normal Obsidian Markdown view

### Requirement: Canonical list-tree format with system tail line
Scoped outliner files MUST be normalized to a canonical Markdown representation:
- YAML frontmatter (if present) is preserved verbatim.
- Body is a list tree using `- ` markers.
- Each block MUST end with a system tail line that:
  - Contains Dataview inline fields for at least `date` and `updated`
  - Contains a protocol marker field `blp_sys` and a protocol version field `blp_ver`
  - Ends with `^<id>` as the last token (no trailing whitespace)

The system tail line MUST be positioned such that Obsidian associates `^<id>` with the intended block (and `#^id` embeds include the subtree).

#### Scenario: Normalize malformed or misplaced system lines
- **GIVEN** a scoped outliner file contains extra or incorrectly-indented system tail lines
- **WHEN** the file is opened in the Outliner View
- **THEN** the plugin rewrites the file to the canonical representation
- **AND** each block ends with exactly one valid system tail line

### Requirement: Treat task syntax as plain text
The Outliner View MUST NOT treat Markdown task syntax (`[ ]`, `[x]`) as structural state.
If a block starts with `- [ ]` or `- [x]`, the bracket text MUST be treated as part of the block content text.

#### Scenario: Roundtrip a task-like prefix without changing content
- **GIVEN** a scoped outliner block whose first visible text starts with `[ ] foo`
- **WHEN** the file is normalized and saved
- **THEN** the stored block content still starts with `[ ] foo` (no task state is inferred)

### Requirement: Logseq-like block editing baseline
Within the Outliner View, block editing MUST follow a Logseq-like baseline:
- `Enter` splits the current block at the cursor into a new sibling block.
- `Shift+Enter` inserts a newline within the current block content.
- `Tab` indents the current block under the previous sibling.
- `Shift+Tab` outdents the current block.
- `Backspace` at the start of a block merges with the previous block (default), with a user setting to prefer outdent when the block has children.
- `Delete` at the end of a block merges with the next block.

Task blocks additionally MUST enforce a single-line invariant:
- A task block MUST NOT contain in-block newlines.
- `Shift+Enter` MUST NOT create an in-block newline for task blocks.

#### Scenario: Shift+Enter does not create a newline in a task block
- **GIVEN** the active block is a task block `[ ] hello`
- **WHEN** the user presses `Shift+Enter`
- **THEN** the task block remains single-line (no `\n` is inserted into the task text)

### Requirement: Outliner editor provides a bridgeable context menu
While editing a block in the Outliner View, the plugin MUST replace the default editor context menu with a plugin-owned context menu.

The menu MUST include, at minimum:
- Cut / Copy
- Paste / Paste as text
- Copy current block as link / embed / URL (BLP block-copy actions)

#### Scenario: Right-click while editing opens the Outliner editor context menu
- **GIVEN** a scoped outliner file is open in the Outliner View
- **AND** the user is editing a block
- **WHEN** the user right-clicks inside the block editor
- **THEN** the Outliner editor context menu opens (not the default minimal OS menu)

### Requirement: Inject editor-menu items from an allowlisted set of plugins
The Outliner editor context menu MUST support injecting additional menu items from Obsidian's `editor-menu` event, subject to a user-configured allowlist of plugin ids.

Injection MUST be best-effort:
- If a plugin handler throws or relies on unsupported Editor APIs, the plugin MUST ignore the failure and continue.
- Only menu item additions attributable to an allowlisted plugin id (or explicitly allowed `"core"`) may be included.

#### Scenario: Allowlisted plugin items appear in the Outliner editor menu
- **GIVEN** the allowlist includes `metadata-menu`
- **WHEN** the user right-clicks inside the block editor
- **THEN** menu items contributed by the `metadata-menu` plugin MAY appear

#### Scenario: Non-allowlisted plugin items are filtered out
- **GIVEN** the allowlist does not include `highlightr-plugin`
- **WHEN** the user right-clicks inside the block editor
- **THEN** menu items contributed by `highlightr-plugin` do not appear

### Requirement: Copy block actions always target the current block id
Within the Outliner editor context menu, BLP's "copy block" actions MUST always use the current block id as the copied target (e.g. `[[file#^id]]`, `![[file#^id]]`, `obsidian://...#^id`).

If the user has a text selection within the block editor, the copied link MAY use the selection as the alias text, but the id MUST still be the current block id.

#### Scenario: Selection affects alias but not block target id
- **GIVEN** the user selects text within the active outliner block editor
- **WHEN** the user chooses "Copy block as link"
- **THEN** the copied markdown link targets `#^<currentBlockId>`
- **AND** the alias text reflects the selection (best-effort)

### Requirement: Task blocks render with a checkbox UI in display mode
When an outliner block's first visible line starts with a task marker prefix (`[ ] `, `[x] `, or `[X] `), the Outliner View display surface MUST:
- Render a checkbox control reflecting the task state (unchecked for `[ ]`, checked for `[x]`/`[X]`)
- Render the remaining block Markdown *without* showing the marker prefix text (the visible content begins after the marker)
- Render done tasks (`[x]`/`[X]`) with a visual completion style (strikethrough) in display mode

The on-disk representation MUST remain Obsidian-native Markdown tasks (`- [ ] ...` / `- [x] ...`).

#### Scenario: Done task shows strikethrough
- **GIVEN** a task block whose first visible line is `[x] test`
- **WHEN** the Outliner View renders the block display
- **THEN** the rendered text contains `test`
- **AND** the rendered text is visually styled as completed (strikethrough)

### Requirement: Clicking the task checkbox toggles task status without entering edit mode
When a task checkbox is clicked in the Outliner View display surface, the Outliner View MUST treat it as a non-editing interaction:
- The block MUST NOT enter edit mode as a side effect of the click
- The block's first-line task marker MUST toggle `[ ]` ↔ `[x]`
- The change MUST be persisted to disk via the outliner file protocol

#### Scenario: Checkbox click toggles and persists
- **GIVEN** a displayed task block `[ ] hello`
- **WHEN** the user clicks its checkbox
- **THEN** the block becomes `[x] hello`
- **AND** the underlying Markdown file stores the task as `- [x] hello`

### Requirement: Task commands are registered for hotkeys
The plugin MUST register two commands that are available for Hotkeys / Command Palette while the Outliner View is active:
- Toggle task status (`[ ]` ↔ `[x]`) for the active block
- Toggle task marker (task ↔ normal block) for the active block

#### Scenario: Commands are available only in Outliner View
- **GIVEN** the active pane is a normal Markdown view
- **WHEN** the user triggers the Outliner task commands
- **THEN** the commands do nothing (not applicable)
- **GIVEN** the active pane is the Outliner View
- **WHEN** the user triggers the Outliner task commands
- **THEN** the active block is updated accordingly

### Requirement: Bullet context menu supports task conversion
The Outliner View bullet context menu MUST provide task conversion actions:
- If the block is not a task, offer "Convert to task" (adds `[ ] ` prefix)
- If the block is a task, offer "Convert to normal block" (removes marker prefix)

#### Scenario: Convert to task from menu
- **GIVEN** a normal block `hello`
- **WHEN** the user chooses "Convert to task" from the bullet context menu
- **THEN** the block becomes `[ ] hello`

### Requirement: Outliner block rendering avoids Reading/Preview artifacts
The Outliner View MUST NOT display Reading/Preview-only UI artifacts (e.g. codeblock copy button) in its block content surface.

#### Scenario: Code blocks do not show copy button
- **GIVEN** a block contains a fenced code block
- **WHEN** the block is rendered in the Outliner View
- **THEN** no `copy-code-button` UI is present in the outliner DOM

### Requirement: Arrow navigation caches visible order for neighbor lookup
The Outliner View MUST cache the computed visible block order and an O(1) index for neighbor lookup during cross-block `ArrowUp`/`ArrowDown` navigation.

The cache MUST be invalidated when:
- The render scope changes (zoom in/out, zoom stack pruning)
- The collapsed set changes
- The file model is reloaded or structurally modified (`clear`, `setViewData`, `applyEngineResult`)

#### Scenario: Cache invalidation follows collapse and zoom scope
- **GIVEN** an outliner file with a parent block that has children and a later visible sibling
- **WHEN** the parent is collapsed
- **THEN** `ArrowDown` from the parent at the visual bottom jumps to the next visible sibling (skipping hidden descendants)
- **WHEN** the view zooms into the parent
- **THEN** arrow navigation range is constrained to the zoom subtree

### Requirement: Block display rendering is visibility-driven
The Outliner View MUST render each block's display surface with a visibility-driven strategy:
- Blocks within the visible viewport (plus a small buffer) MUST render using the standard Markdown rendering pipeline.
- Blocks outside the renderable area MUST NOT eagerly invoke Markdown rendering.

#### Scenario: Offscreen blocks are not eagerly Markdown-rendered
- **GIVEN** an outliner file with many blocks such that most blocks are outside the viewport
- **WHEN** the file is opened in the Outliner View
- **THEN** only blocks in the visible area (plus buffer) are rendered with Markdown
- **AND** offscreen blocks are deferred until they become visible

### Requirement: Offscreen blocks show a plain-text placeholder
When a block has not yet been Markdown-rendered, the Outliner View MUST show a plain-text placeholder that preserves readability while avoiding nested Markdown structure.

#### Scenario: Placeholder is replaced when the block becomes visible
- **GIVEN** a block initially outside the viewport
- **WHEN** the user scrolls so the block becomes visible
- **THEN** the placeholder is replaced by the Markdown-rendered display

### Requirement: ArrowUp/ArrowDown moves caret across visible blocks
Within the Outliner View block editor, pressing plain `ArrowUp` / `ArrowDown` (no modifier keys) MUST provide continuous vertical caret navigation across blocks:
- `ArrowUp` at the visual top of the current block MUST move focus to the previous **visible** block and place the caret on its last line.
- `ArrowDown` at the visual bottom of the current block MUST move focus to the next **visible** block and place the caret on its first line.
- This navigation MUST NOT create new blocks.
- If there is no previous/next visible block, the caret MUST NOT move.

The previous/next visible block order MUST be computed from the current render scope:
- Zoom scope (render root) MUST constrain the navigation range.
- Collapsed nodes MUST hide their descendants from the visible order.

#### Scenario: ArrowUp from first visible block does nothing
- **GIVEN** the caret is at the visual top of the first visible block
- **WHEN** the user presses `ArrowUp`
- **THEN** the caret does not move

#### Scenario: ArrowDown from last visible block does nothing
- **GIVEN** the caret is at the visual bottom of the last visible block
- **WHEN** the user presses `ArrowDown`
- **THEN** the caret does not move

#### Scenario: ArrowDown from a collapsed parent skips hidden children
- **GIVEN** a parent block has children
- **AND** the parent block is collapsed
- **WHEN** the caret is at the visual bottom of the parent block and the user presses `ArrowDown`
- **THEN** the caret jumps to the next visible sibling block after the collapsed subtree

### Requirement: Cross-block ArrowUp/Down preserves goal column
During continuous ArrowUp/ArrowDown navigation, the Outliner View MUST preserve a sticky goal column:
- The initial `goalCh` MUST be derived from the caret column (ch) before the first ArrowUp/Down in the session.
- Cross-block jumps MUST use `goalCh` even if an intermediate block clamps the caret to a shorter line.
- The goal column session MUST reset on non-plain ArrowUp/Down input (typing, pointer positioning, other keys).

#### Scenario: Goal column survives a short-line clamp between blocks
- **GIVEN** the user starts at column 8 on a long line and presses `ArrowDown` at block bottom
- **AND** the next block is a single-character line (caret clamps to column 1)
- **WHEN** the user presses `ArrowDown` again at that block bottom
- **THEN** the caret lands in the next long block at column 8 (not column 1)

### Requirement: Internal links in outliner block display are navigable
When the Outliner View renders block display Markdown, internal links MUST be clickable and open using Obsidian’s navigation pipeline.

#### Scenario: Click `[[note#^id|alias]]` in outliner display opens the target
- **GIVEN** an outliner file is open in Outliner View
- **AND** a block display contains a rendered internal link with a `#^id` subpath
- **WHEN** the user clicks the link
- **THEN** Obsidian opens the target file and scrolls to the referenced block

### Requirement: Inline edit embeds can be edited inside outliner display
When inline edit is enabled, clicking an embed rendered inside outliner block display MUST mount an inline editor for that embed in-place (Outliner View only).

#### Scenario: Click `![[note#^id-id]]` mounts an inline editor
- **GIVEN** inline edit is enabled
- **AND** an outliner block display contains `![[note#^id-id]]`
- **WHEN** the user clicks the embed body
- **THEN** an inline editor is mounted inside that embed container

### Requirement: Bullet-handle drag-and-drop moves block subtrees
Within the Outliner View, users MUST be able to drag a block by its bullet handle to move the entire block subtree:
- before/after another block (reorder)
- inside another block (append as child) when dragging horizontally toward the content area

The UI MUST provide a minimal drop indicator and MUST NOT trigger click-to-zoom immediately after a drag gesture.

#### Scenario: Drag to reorder siblings
- **GIVEN** a scoped outliner file is open in the Outliner View with root blocks `A`, `B`, `C`
- **WHEN** the user drags block `B` and drops it after block `C`
- **THEN** the file model is updated so the root order is `A`, `C`, `B`

#### Scenario: Drag to move inside as child
- **GIVEN** a scoped outliner file is open in the Outliner View with root blocks `A`, `C`
- **WHEN** the user drags block `C` and drops it inside block `A`
- **THEN** `C` becomes the last child of `A`

### Requirement: Outliner routing ignores detached embed leaves
When the Outliner View routing is enabled, it MUST NOT affect internal/detached `WorkspaceLeaf` instances created for embed rendering (e.g. InlineEditEngine).

#### Scenario: Inline-edit embed is not routed to Outliner View
- **GIVEN** Outliner View routing is enabled
- **WHEN** InlineEditEngine creates an internal `WorkspaceLeaf` to render an embed
- **THEN** the embed leaf continues to open a normal `MarkdownView` (not the Outliner View)

### Requirement: Embeds inside Outliner View are interactive and hide system tail lines
Within the Outliner View block display surface, embedded blocks MUST remain interactive and Outliner v2 system tail lines MUST be hidden.

Details:
- clicking embedded blocks MUST NOT enter host block edit mode
- Outliner v2 system tail lines (`[blp_sys:: 1] ...`) MUST be hidden in embedded content rendered by `MarkdownRenderer`

#### Scenario: Click embed does not enter host edit mode
- **GIVEN** a block display contains an embedded block (`![[file#^id]]`)
- **WHEN** the user clicks the embed content
- **THEN** the host block does not enter edit mode

### Requirement: Outliner View provides toggles for key Logseq-like affordances
The system SHALL provide user-facing settings (with localization support) to enable/disable the following Outliner View behaviors:
- bullet-handle drag-and-drop (move block subtrees)
- bullet-click zoom navigation (zoom into subtree)
- active-block left emphasis connector line

Disabling a behavior MUST gate the corresponding UI interactions without changing the underlying file protocol.

#### Scenario: Drag-and-drop disabled prevents subtree moves
- **GIVEN** an outliner file is open in the Outliner View
- **AND** drag-and-drop is disabled in settings
- **WHEN** the user drags a block by its bullet handle
- **THEN** no move is applied to the block subtree

#### Scenario: Zoom disabled prevents zoom navigation
- **GIVEN** an outliner file is open in the Outliner View
- **AND** zoom is disabled in settings
- **WHEN** the user clicks a block bullet
- **THEN** the view does not enter a zoomed subtree state

#### Scenario: Emphasis line disabled keeps the connector muted
- **GIVEN** an outliner file is open in the Outliner View
- **AND** emphasis line is disabled in settings
- **WHEN** the user edits a block
- **THEN** the active block highlight remains
- **AND** the active connector line is rendered in a muted color (not the accent/emphasis color)

### Requirement: Mouse insert affordance for new blocks
The Outliner View MUST provide a mouse-driven affordance to create a new empty sibling block at a specific insertion point.

#### Scenario: Insert after an existing block
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user triggers the "new block here" affordance after a block
- **THEN** a new empty sibling block is created after that block
- **AND** focus moves to the new block for editing

### Requirement: Ephemeral folding of child subtrees
When a block has children, the Outliner View MUST provide a fold toggle that collapses/expands the subtree in the UI.
Folding state MUST be ephemeral (not persisted to disk).

#### Scenario: Collapse does not rewrite the file
- **GIVEN** a block has children and is expanded
- **WHEN** the user collapses the block in the Outliner View
- **THEN** the children are hidden in the UI
- **AND** the underlying Markdown file content is unchanged (no fold markers are written)

### Requirement: Zoom into a block subtree
The Outliner View MUST support zooming into a block so the view focuses on that block and its subtree, with a minimal way to zoom out.
Zoom state MUST be ephemeral (not persisted to disk).

#### Scenario: Bullet click zooms into the subtree
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user clicks a block bullet
- **THEN** the view zooms into that block and renders only its subtree

### Requirement: Bullet context menu for block actions
The Outliner View MUST expose a context menu on the block bullet that includes:
- Copy block reference link
- Copy block embed link
- Copy block URL
- Copy / Cut / Delete block subtree
- Collapse / Expand (when applicable)

Copy/Cut MUST serialize the visible subtree as Markdown list text without BLP system tail lines.

#### Scenario: Copy block reference from context menu
- **GIVEN** a block has a `^id`
- **WHEN** the user selects "Copy block reference" from the bullet context menu
- **THEN** the clipboard contains a `[[file#^id]]`-style link (or equivalent generated link) for the active file

### Requirement: Callout spacing is normalized within block display
Within the Outliner View, callouts rendered inside a block MUST NOT introduce extra external margins compared to other normalized elements (e.g. `pre`, `blockquote`).

#### Scenario: Callout does not add vertical margins
- **GIVEN** a block contains a callout
- **WHEN** the block is rendered in the Outliner View
- **THEN** the callout element has zero external margin within `.blp-file-outliner-display`

### Requirement: Provide a reciprocal “Open as Outliner” toggle in Markdown view
When a scoped file is open in the native Markdown view, the pane menu MUST provide an action to open the same file in the File Outliner View (v2).

#### Scenario: Toggle from Markdown back to Outliner
- **GIVEN** a file is in File Outliner scope
- **AND** the file is currently open in the native Markdown view
- **WHEN** the user selects “Open as Outliner” from the pane menu
- **THEN** the current pane switches to the File Outliner View for the same file

### Requirement: Mod+Shift+V pastes multiline text into a single block
When editing a block in the File Outliner View, the plugin MUST apply the following paste rules:
- `Mod+V` MUST follow the configured "Paste multiline" behavior.
- `Mod+Shift+V` MUST paste as plain multiline text within the current block (MUST NOT split into multiple blocks).

#### Scenario: Plain paste bypasses split behavior
- **GIVEN** "Paste multiline" is configured as `split`
- **WHEN** the user presses `Mod+Shift+V` to paste multiline text
- **THEN** the outliner DOES NOT create new sibling blocks from the pasted lines

### Requirement: Mod+Enter toggles a block-level task marker
When editing a block in the File Outliner View, `Mod+Enter` MUST toggle a task marker prefix on the first line:
- If the first line starts with `[ ] `, it becomes `[x] `.
- If the first line starts with `[x] ` or `[X] `, it becomes `[ ] `.
- Otherwise, `[ ] ` is inserted at the start of the first line.

#### Scenario: Toggle task marker cycles between unchecked and checked
- **GIVEN** the active block first line is `hello`
- **WHEN** the user presses `Mod+Enter`
- **THEN** the first line becomes `[ ] hello`
- **WHEN** the user presses `Mod+Enter` again
- **THEN** the first line becomes `[x] hello`

### Requirement: Outliner editor bridges Obsidian EditorSuggest for `[[` and `/`
Within the Outliner View, the block editor MUST bridge Obsidian's `workspace.editorSuggest` so that:
- Typing `[[` can open the native link/file suggest UI.
- Typing `/` can open the native slash-command suggest UI.

This MUST be implemented without copying the full Obsidian Markdown editor CM6 extension stack.

#### Scenario: Link suggest opens on `[[`
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user enters edit mode and types `[[`
- **THEN** the Obsidian link/file suggestion UI opens

#### Scenario: Slash suggest opens on `/`
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user enters edit mode and types `/`
- **THEN** the Obsidian slash-command suggestion UI opens

### Requirement: Outliner display normalizes internal markdown embeds
When the Outliner View renders block display via `MarkdownRenderer.render(...)`, it MUST normalize internal markdown embeds so their DOM shape is compatible with BLP embed post-processing and reading-range rendering.

At minimum, each `.internal-embed.markdown-embed` MUST contain a `.markdown-embed-content` element wrapping the rendered markdown preview content.

#### Scenario: `^id-id` reading-range renders multi-line content in outliner display
- **GIVEN** an outliner block display contains an embed `![[file#^id-id]]`
- **WHEN** the outliner block is rendered
- **THEN** the displayed embed includes the referenced multi-line range (not only the marker line)

### Requirement: Provide a source-view escape hatch
The Outliner View MUST provide a pane menu action that opens the current file in the native Obsidian Markdown editor in source mode, bypassing outliner routing.

#### Scenario: Open the same file in Markdown source view
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user selects "Open source view" from the pane menu
- **THEN** the current pane switches to the native Markdown view
- **AND** the editor is in source mode for the same file path

### Requirement: Enter on a task block continues as a task block
When the active block is a task block, pressing `Enter` to create the next sibling block MUST continue task entry:
- The newly created sibling block MUST start with the todo marker prefix `[ ] `
- Focus MUST move to the new block after the `[ ] ` prefix

#### Scenario: Enter on a task creates the next todo task
- **GIVEN** the active block is a task block `[ ] a`
- **WHEN** the user presses `Enter` at the end of the block
- **THEN** a new sibling block is created whose text starts with `[ ] `
- **AND** focus is placed after the task marker prefix

### Requirement: Multi-line task content is normalized into a single-line task + child content
If a scoped outliner file contains a task block whose text spans multiple lines, the plugin MUST normalize it so that the task block is single-line while preserving the additional content.

#### Scenario: Normalize a multi-line task block
- **GIVEN** a task block whose stored text is `[ ] a\nb`
- **WHEN** the file is opened in the Outliner View (normalization occurs)
- **THEN** the task block becomes single-line (`[ ] a`)
- **AND** the additional content (`b`) remains available within the task subtree

