# file-outliner-view Specification (Delta)

## ADDED Requirements

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
