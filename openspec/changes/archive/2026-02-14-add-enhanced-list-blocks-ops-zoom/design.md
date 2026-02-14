# Design: Embed vslinko Outliner/Zoom as Built-in Modules

## High-level approach
- Vendor upstream source code into this repository:
  - `obsidian-outliner@4.9.0` (MIT)
  - `obsidian-zoom@1.1.2` (MIT)
- Add a thin BLP integration layer that:
  - persists each plugin’s settings inside BLP’s storage
  - exposes each plugin as a toggleable “built-in module”
  - applies upstream CSS (scoped by upstream body classes)
  - keeps `window.ObsidianZoomPlugin` compatible so Outliner can call Zoom

## Enablement & conflicts
- Built-in modules are opt-in and MUST default to off.
- Conflict handling:
  - If external `obsidian-outliner` is enabled, BLP MUST default-disable built-in Outliner.
  - If external `obsidian-zoom` is enabled, BLP MUST default-disable built-in Zoom.
- Built-in modules MUST NOT use Enhanced List Blocks “enabled file scope”; they behave like the upstream plugins (global).

## Storage strategy
- Store each upstream plugin’s settings under a dedicated subtree in BLP settings data.
- The integration layer provides a small `Storage` adapter compatible with upstream settings services (`loadData()` / `saveData()`).

## Runtime lifecycle
- On BLP `onload()`:
  - load BLP settings
  - load built-in module settings
  - evaluate conflicts and update effective enablement
  - register upstream features (commands/extensions/CSS hooks)
- On BLP `onunload()`:
  - run built-in modules’ `unload()` to remove event listeners and clean globals/classes where possible.

## Removal of custom Enhanced List Blocks Ops
- Remove BLP’s custom list ops implementation (zoom/move/indent/dnd/vertical-lines/threading) to avoid divergence and double behavior.
- Keep Enhanced List Blocks Query/View (`blp-view`) and any BLP-specific list-block utilities that are not part of outliner/zoom.
