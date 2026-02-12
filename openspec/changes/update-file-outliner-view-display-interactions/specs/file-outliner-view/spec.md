# file-outliner-view Specification (Delta)

## ADDED Requirements

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

