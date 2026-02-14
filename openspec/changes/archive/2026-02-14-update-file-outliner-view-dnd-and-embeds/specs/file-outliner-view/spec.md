# file-outliner-view Specification (Delta)

## ADDED Requirements

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
