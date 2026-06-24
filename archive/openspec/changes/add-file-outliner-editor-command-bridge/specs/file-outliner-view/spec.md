## ADDED Requirements

### Requirement: Outliner editor provides an editor-command bridge for core + allowlisted plugins
When editing a block in the File Outliner View, the plugin MUST provide an editor-command bridge so that
Obsidian editor commands (and allowlisted plugin editor commands) can execute against the Outliner block editor.

The bridge MUST be implemented without importing/copying the native Obsidian Markdown editor CM6 extension stack.

#### Scenario: Core editor shortcut executes in Outliner
- **GIVEN** a scoped file is open in the File Outliner View
- **AND** the user is editing a block
- **WHEN** the user triggers a core editor command (e.g. `editor:toggle-bold`)
- **THEN** the command executes and updates the Outliner block text

### Requirement: Strict allowlist gates editor commands while the Outliner bridge is active
While the Outliner editor-command bridge is active, the plugin MUST enforce a strict allowlist for editor commands:

- Only commands attributable to allowlisted plugin ids (or `core`) may execute as editor commands.
- Non-editor commands MUST NOT be blocked by this gate.
- Attribution MUST be best-effort:
  - Prefer `command.id` prefix (before `:`) when it matches an installed plugin id.
  - Otherwise treat the command as `core`.

#### Scenario: Non-allowlisted plugin editor command is blocked
- **GIVEN** the Outliner editor-command bridge is active
- **AND** the command allowlist does not include plugin id `highlightr-plugin`
- **WHEN** the user triggers an editor command `highlightr-plugin:Red`
- **THEN** the command does not execute (no change to the block text)

#### Scenario: Allowlisted plugin editor command is allowed
- **GIVEN** the Outliner editor-command bridge is active
- **AND** the command allowlist includes plugin id `highlightr-plugin`
- **WHEN** the user triggers an editor command `highlightr-plugin:Red`
- **THEN** the command executes and updates the block text

