## ADDED Requirements

### Requirement: Configure Outliner editor-command bridge and command allowlist
The settings UI MUST provide controls for the File Outliner editor-command bridge:

- Enable/disable the editor-command bridge
- Edit an allowlist of plugin ids that are allowed to run editor commands in Outliner (include `core` for core editor commands)

Defaults:
- The editor-command bridge MUST default to enabled.
- The command allowlist MUST default to including `core`.

#### Scenario: User enables a plugin editor command in Outliner
- **GIVEN** the user opens the Outliner settings tab
- **WHEN** the user adds plugin id `highlightr-plugin` to the Outliner command allowlist
- **THEN** the plugin id is persisted to `fileOutlinerEditorCommandAllowedPlugins`

### Requirement: Provide a one-click copy action between Outliner allowlists
The settings UI MUST provide a one-click action to copy the editor-menu allowlist into the command allowlist.

The UI MUST clearly warn that:
- Only command/editorCallback based plugins are supported
- Plugins that rely on CM6 editor injection into MarkdownView may not work in Outliner

#### Scenario: User copies menu allowlist into command allowlist
- **GIVEN** `fileOutlinerEditorContextMenuAllowedPlugins` contains `metadata-menu`
- **WHEN** the user clicks "Copy from editor menu allowlist"
- **THEN** `fileOutlinerEditorCommandAllowedPlugins` becomes `metadata-menu` (and any other menu allowlist entries)

