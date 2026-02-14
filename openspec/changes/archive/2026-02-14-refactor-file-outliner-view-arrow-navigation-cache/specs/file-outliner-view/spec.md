# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Arrow navigation caches visible order for neighbor lookup
The Outliner View MUST cache the computed visible block order and an O(1) index for neighbor lookup during cross-block `ArrowUp`/`ArrowDown` navigation.

The cache MUST be invalidated when:
- The render scope changes (zoom in/out, zoom stack pruning)
- The collapsed set changes
- The file model is reloaded or structurally modified (`clear`, `setViewData`, `applyEngineResult`)

#### Scenario: Cache invalidation follows collapse and zoom scope
- **GIVEN** an outliner file with a parent block that has children and a later visible sibling
- **WHEN** the parent is collapsed
- **THEN** `ArrowDown` from the parent at the visual bottom jumps to the next visible sibling (skipping hidden descendants)
- **WHEN** the view zooms into the parent
- **THEN** arrow navigation range is constrained to the zoom subtree

