# file-outliner-view Specification (Delta)

## ADDED Requirements

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

