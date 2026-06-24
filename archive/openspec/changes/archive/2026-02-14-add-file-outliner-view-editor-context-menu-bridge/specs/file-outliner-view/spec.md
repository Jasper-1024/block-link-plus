# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Outliner editor provides a bridgeable context menu
While editing a block in the Outliner View, the plugin MUST replace the default editor context menu with a plugin-owned context menu.

The menu MUST include, at minimum:
- Cut / Copy
- Paste / Paste as text
- Copy current block as link / embed / URL (BLP block-copy actions)

#### Scenario: Right-click while editing opens the Outliner editor context menu
- **GIVEN** a scoped outliner file is open in the Outliner View
- **AND** the user is editing a block
- **WHEN** the user right-clicks inside the block editor
- **THEN** the Outliner editor context menu opens (not the default minimal OS menu)

### Requirement: Inject editor-menu items from an allowlisted set of plugins
The Outliner editor context menu MUST support injecting additional menu items from Obsidian's `editor-menu` event, subject to a user-configured allowlist of plugin ids.

Injection MUST be best-effort:
- If a plugin handler throws or relies on unsupported Editor APIs, the plugin MUST ignore the failure and continue.
- Only menu item additions attributable to an allowlisted plugin id (or explicitly allowed `"core"`) may be included.

#### Scenario: Allowlisted plugin items appear in the Outliner editor menu
- **GIVEN** the allowlist includes `metadata-menu`
- **WHEN** the user right-clicks inside the block editor
- **THEN** menu items contributed by the `metadata-menu` plugin MAY appear

#### Scenario: Non-allowlisted plugin items are filtered out
- **GIVEN** the allowlist does not include `highlightr-plugin`
- **WHEN** the user right-clicks inside the block editor
- **THEN** menu items contributed by `highlightr-plugin` do not appear

### Requirement: Copy block actions always target the current block id
Within the Outliner editor context menu, BLP's "copy block" actions MUST always use the current block id as the copied target (e.g. `[[file#^id]]`, `![[file#^id]]`, `obsidian://...#^id`).

If the user has a text selection within the block editor, the copied link MAY use the selection as the alias text, but the id MUST still be the current block id.

#### Scenario: Selection affects alias but not block target id
- **GIVEN** the user selects text within the active outliner block editor
- **WHEN** the user chooses "Copy block as link"
- **THEN** the copied markdown link targets `#^<currentBlockId>`
- **AND** the alias text reflects the selection (best-effort)

