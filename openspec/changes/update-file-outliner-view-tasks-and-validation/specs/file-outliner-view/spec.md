# file-outliner-view Specification (Delta)

## MODIFIED Requirements

### Requirement: Task syntax is supported as a block-level marker
The Outliner View MUST support Obsidian-native Markdown tasks while keeping the outliner structure as the only list-tree structure.

Rules:
- A block's *visible text* MAY start with `[ ] ` or `[x] ` to indicate a task marker.
- When serialized to disk, the block MUST be stored as a Markdown task item (`- [ ] ...` / `- [x] ...`).
- Users MUST NOT rely on writing `- [ ]` / `- [x]` *inside the block body* to express nested structure; the only structure is the Outliner tree.

#### Scenario: Task block roundtrips as Markdown task item on disk
- **GIVEN** an outliner block whose first visible text starts with `[ ] foo`
- **WHEN** the file is normalized and saved
- **THEN** the stored block is a Markdown task item (`- [ ] foo`)

## ADDED Requirements

### Requirement: Render-time validation for unsupported block-internal Markdown
When rendering a block's display surface, the Outliner View MUST detect unsupported block-internal Markdown constructs outside fenced code blocks:
- list item markers (ul/ol)
- ATX headings (`#` .. `######`)

When such constructs are present, the Outliner View MUST:
- display an inline warning banner (non-blocking)
- render a sanitized representation that does not create nested structure

#### Scenario: Block-internal list triggers warning and sanitized render
- **GIVEN** a block contains a non-fenced line starting with `- ` at the beginning of the line
- **WHEN** the Outliner View renders the block display
- **THEN** a warning banner is shown
- **AND** the line renders as literal text (not a nested list)

### Requirement: System tail line is the last continuation line before children
To remain compatible with Obsidian block indexing for `#^id` embeds, the Outliner protocol MUST ensure:
- a block's system tail line is positioned after all continuation lines of the block content
- and immediately before any child list items

#### Scenario: Tail line is relocated after continuation lines
- **GIVEN** a block whose system tail line appears before additional continuation lines
- **WHEN** the file is normalized
- **THEN** the normalized output places the system tail line after those continuation lines

