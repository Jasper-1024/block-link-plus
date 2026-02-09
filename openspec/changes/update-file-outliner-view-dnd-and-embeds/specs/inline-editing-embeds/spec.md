# inline-editing-embeds Specification (Delta)

## ADDED Requirements

### Requirement: Inline edit embeds hide Outliner v2 system tail lines
When an inline-edit embed renders content that contains an Outliner v2 system tail line (identified by `[blp_sys:: 1]`), the system tail line MUST NOT be visible in the embed surface.

#### Scenario: Block embed does not display system tail line
- **GIVEN** a Live Preview inline-edit embed renders an Outliner v2 block that includes a system tail line
- **WHEN** the embed editor is mounted
- **THEN** the embed surface does not expose `blp_sys`/`blp_ver`/`date`/`updated` system tail tokens

