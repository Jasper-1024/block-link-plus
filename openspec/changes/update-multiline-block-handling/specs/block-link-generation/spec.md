## MODIFIED Requirements
### Requirement: Handle headings and list items robustly
The plugin SHALL insert and resolve block IDs for list items correctly. Each list item MUST be treated as its own targetable block for ID insertion/link generation, even though Obsidian metadata may represent an entire contiguous list as a single `"list"` section.

#### Scenario: Generate link for a list item
- **WHEN** the cursor/selection is within a list item and the user runs "Copy Block Link"
- **THEN** the plugin inserts (or reuses) the `^id` for that list item and copies a link targeting that list item

#### Scenario: List item after a previously linked item
- **WHEN** the previous list item already has a block link/ID and the active list item does not
- **THEN** the plugin MUST NOT reuse the previous item's ID and MUST insert a new `^id` for the active list item

#### Scenario: Active list item already has an ID
- **WHEN** the active list item line already ends with a `^id`
- **THEN** the plugin MUST reuse that `^id` and MUST NOT add a second ID to the same list item

#### Scenario: Do not reuse the first list item's ID
- **WHEN** the list's first item has a `^id` but the active item is a later list item
- **THEN** the plugin MUST NOT copy a link to the first item's `^id`; it MUST target the active list item
