## Context
Outliner v2 uses a standalone CM6 `EditorView` (S3 minimal bridge) rather than Obsidian's full Markdown editor stack. As a result, right-click in the Outliner editor does not run Obsidian's normal menu construction path.

We need a bridge that:
- Keeps Outliner semantics stable (block id is the source of truth).
- Allows *selected* plugin context menu items to reappear in the Outliner editor (best-effort).
- Avoids copying Obsidian internals wholesale.

## Goals / Non-Goals
- Goals:
  - Replace the Outliner editor default context menu with a BLP-owned menu.
  - Provide minimal clipboard actions and BLP block-copy actions.
  - Allow user-configured plugin menu injection (allowlist).
- Non-Goals:
  - Perfect compatibility with all plugins' editor-menu items.
  - Full reproduction of the native MarkdownView context menu.

## Decisions
### Decision: Filter injected menu items by plugin id using call-site stack traces
Obsidian does not expose "which plugin added this MenuItem" metadata. We attribute menu item origin by capturing `Error().stack` inside `menu.addItem/addSeparator` wrappers while running editor-menu handlers.

Plugin id extraction rules (best-effort):
- Prefer `plugin:<id>:` stack frames when present.
- Fallback to file paths containing `/plugins/<id>/` or `\\plugins\\<id>\\`.
- Otherwise attribute to `"core"`.

### Decision: Run handlers defensively using internal `workspace._["editor-menu"]`
To avoid a single plugin throwing and breaking all menu injection, we iterate handlers and wrap each call in `try/catch`. If the internal list is unavailable, fallback to `workspace.trigger("editor-menu", ...)`.

This is a deliberate non-public API usage, gated behind the allowlist setting.

### Decision: Outliner block-copy semantics override selection-based behavior
BLP block-copy items in the Outliner editor always target the *current block id*:
- The copied link target MUST be `#^<currentBlockId>`.
- If there is an editor selection, it MAY be used as the link alias text.

## Risks / Trade-offs
- Stack attribution can be brittle across Obsidian versions; mitigated by best-effort parsing and "fail closed" filtering.
- Some plugins' editor-menu handlers may rely on Editor APIs not implemented by `OutlinerSuggestEditor`; these handlers are isolated and ignored (debug log only).

