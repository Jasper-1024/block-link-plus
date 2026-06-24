## Why

File Outliner uses a standalone CodeMirror 6 editor ("minimal bridge" mode) for block editing.
This breaks many editor shortcut workflows because Obsidian (core + many plugins) gates editor
commands on `app.workspace.activeEditor`. When Outliner is active, `activeEditor` is `null`,
so commands like `editor:toggle-bold` and editorCallback-based plugins do not execute.

We want Outliner editing to feel like normal Obsidian editing for common editor shortcuts,
while keeping the minimal-bridge architecture and avoiding CM6 extension injection compatibility.

## What Changes

- Add an Outliner editor "command bridge" that enables editor commands during Outliner block editing.
- Add a **strict** plugin allowlist that controls which editor commands are allowed to run in Outliner.
  - Core editor commands are treated as `core`.
  - Only allowlisted plugin ids may run editor commands while the Outliner editor bridge is active.
- Keep existing editor context-menu allowlist separate, but add a one-click action to copy/sync lists.

## Non-Goals

- Do not attempt to support plugins that rely on injecting CM6 extensions into the native Markdown editor.
- Do not provide full API compatibility with Obsidian's native MarkdownView editor stack.

## Impact

- Users regain core formatting shortcuts (e.g. bold/italic/strikethrough/highlight) while editing Outliner blocks.
- Users can opt-in specific editor shortcut plugins (by plugin id) to work inside Outliner.
- Safer than a permissive bridge: non-allowlisted plugins cannot run editor commands in Outliner.

