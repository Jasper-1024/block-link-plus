# file-outliner-view Specification (Delta)

## MODIFIED Requirements

### Requirement: Logseq-like block editing baseline
Within the Outliner View, block editing MUST be powered by a native CM6 editor surface (e.g. `EditorView`) rather than a custom textarea, to preserve IME/undo/selection behavior.

#### Scenario: Editing uses a CM6 surface
- **GIVEN** a scoped outliner file is open in the Outliner View
- **WHEN** the user activates a block for editing
- **THEN** the block is edited via a CM6 editor surface (not a textarea)

## ADDED Requirements

### Requirement: Outliner block rendering avoids Reading/Preview artifacts
The Outliner View MUST NOT display Reading/Preview-only UI artifacts (e.g. codeblock copy button) in its block content surface.

#### Scenario: Code blocks do not show copy button
- **GIVEN** a block contains a fenced code block
- **WHEN** the block is rendered in the Outliner View
- **THEN** no `copy-code-button` UI is present in the outliner DOM
