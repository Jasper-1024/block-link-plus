# enhanced-list-blocks Spec Delta

## ADDED Requirements
### Requirement: Optional list-item handle affordance in Live Preview
When Enhanced List Blocks is enabled for a file, the plugin SHALL provide an optional “block handle” affordance for list items in Live Preview to improve discoverability of outliner-like interactions.

The affordance:
- MUST be purely visual (MUST NOT modify note content).
- MUST be scoped to Enhanced List Blocks enabled files.
- MUST be configurable via a plugin setting.

#### Scenario: Enabled file shows handle affordance
- **WHEN** a file is Enhanced List Blocks enabled
- **AND** the user enables the handle affordance setting
- **AND** the editor is in Live Preview
- **THEN** the list marker renders with a visible handle affordance and a larger hitbox

#### Scenario: Non-enabled file is unaffected
- **WHEN** a file is NOT Enhanced List Blocks enabled
- **THEN** the plugin does not apply the handle affordance styling

#### Scenario: Source mode is unaffected
- **WHEN** the editor is NOT in Live Preview
- **THEN** the plugin does not apply the handle affordance styling

### Requirement: Ordered lists remain readable
The plugin SHALL avoid hiding or altering ordered list numbering when applying handle affordances.

#### Scenario: Ordered list numbering remains visible
- **WHEN** a line is an ordered list item
- **THEN** the numbering remains visible and readable
