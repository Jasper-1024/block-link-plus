# file-outliner-view Specification (Delta)

## ADDED Requirements
### Requirement: File Outliner View is opt-in and scoped
The plugin MUST only enable the file-level Outliner View for files within the configured scope.

Scope MUST support:
- Plugin settings: enabled folders/files list
- Frontmatter override: `blp_outliner: true|false`

#### Scenario: Enabled by frontmatter outside enabled folders
- **GIVEN** a file is outside the enabled folders/files list
- **AND** its frontmatter contains `blp_outliner: true`
- **WHEN** the user opens the file
- **THEN** the file opens in the Outliner View

#### Scenario: Disabled by frontmatter inside enabled folders
- **GIVEN** a file is inside the enabled folders/files list
- **AND** its frontmatter contains `blp_outliner: false`
- **WHEN** the user opens the file
- **THEN** the file opens in normal Obsidian Markdown view

### Requirement: Canonical list-tree format with system tail line
Scoped outliner files MUST be normalized to a canonical Markdown representation:
- YAML frontmatter (if present) is preserved verbatim.
- Body is a list tree using `- ` markers.
- Each block MUST end with a system tail line that:
  - Contains Dataview inline fields for at least `date` and `updated`
  - Contains a protocol marker field `blp_sys` and a protocol version field `blp_ver`
  - Ends with `^<id>` as the last token (no trailing whitespace)

The system tail line MUST be positioned such that Obsidian associates `^<id>` with the intended block (and `#^id` embeds include the subtree).

#### Scenario: Normalize malformed or misplaced system lines
- **GIVEN** a scoped outliner file contains extra or incorrectly-indented system tail lines
- **WHEN** the file is opened in the Outliner View
- **THEN** the plugin rewrites the file to the canonical representation
- **AND** each block ends with exactly one valid system tail line

### Requirement: Treat task syntax as plain text
The Outliner View MUST NOT treat Markdown task syntax (`[ ]`, `[x]`) as structural state.
If a block starts with `- [ ]` or `- [x]`, the bracket text MUST be treated as part of the block content text.

#### Scenario: Roundtrip a task-like prefix without changing content
- **GIVEN** a scoped outliner block whose first visible text starts with `[ ] foo`
- **WHEN** the file is normalized and saved
- **THEN** the stored block content still starts with `[ ] foo` (no task state is inferred)

### Requirement: Logseq-like block editing baseline
Within the Outliner View, block editing MUST follow a Logseq-like baseline:
- `Enter` splits the current block at the cursor into a new sibling block.
- `Shift+Enter` inserts a newline within the current block content.
- `Tab` indents the current block under the previous sibling.
- `Shift+Tab` outdents the current block.
- `Backspace` at the start of a block merges with the previous block (default), with a user setting to prefer outdent when the block has children.
- `Delete` at the end of a block merges with the next block.

#### Scenario: Enter on an empty block creates another empty block
- **GIVEN** the active block is empty
- **WHEN** the user presses `Enter`
- **THEN** a new empty sibling block is created
- **AND** focus moves to the new block

