# Change: Fix file outliner search result line jump

## Why
Obsidian search can index content inside File Outliner notes, but clicking a search result opens the custom Outliner view at the top instead of scrolling to the matched block. Runtime debugging shows Obsidian provides line-oriented ephemeral state for search result navigation, while the Outliner view only handles `#^block-id` subpaths.

## What Changes
- Map Obsidian line-oriented open state to the corresponding Outliner block.
- Scroll the mapped block into view when a routed Outliner file opens from search results.
- Preserve existing `#^block-id` navigation behavior and precedence.
- Add regression coverage and verify the fix in the live Obsidian CDP debug environment.

## Impact
- Affected specs: `file-outliner-view`
- Affected code: File Outliner view navigation state handling and focused test helpers
