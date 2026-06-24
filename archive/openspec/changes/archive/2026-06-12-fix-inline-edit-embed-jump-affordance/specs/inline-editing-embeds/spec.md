## ADDED Requirements
### Requirement: Preserve Native Embed Jump Affordance
Inline edit embeds SHALL preserve Obsidian's native top-level embed jump/open affordance while replacing the native preview content with the inline-edit editor.

#### Scenario: Inline edit keeps the native jump link
- **WHEN** an inline-edit embed is mounted in Live Preview
- **THEN** the top-level native `.markdown-embed-link` remains connected, visible, and clickable
- **AND** BLP does not detach or remove that native jump affordance

#### Scenario: Shell updates keep the native jump link
- **WHEN** Obsidian creates or recreates the native embed shell while inline edit is active
- **THEN** BLP reconciles its inline-edit host without removing the top-level native `.markdown-embed-link`

#### Scenario: Native preview content remains hidden
- **WHEN** BLP mounts the inline-edit host inside the native `.markdown-embed-content`
- **THEN** native preview children remain hidden so system tail tokens are not visible
- **AND** the native jump affordance remains outside that hidden preview content
