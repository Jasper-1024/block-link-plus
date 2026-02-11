# file-outliner-view Specification (Delta)

## ADDED Requirements

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

