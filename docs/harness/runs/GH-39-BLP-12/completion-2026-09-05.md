# BLP-12 manual completion and design amendment, 2026-09-05

Implementation and scoped verification are complete. The user requested this final compatibility fix as the end of the current work. This record does not mark a merge, release, or remote Plane publication.

## Current behavior (supersedes historical focus descriptions)

This amendment applies to the older approved-design.md, implementation-routing.md, implementation.md and code-review.md in this directory. Preserve those historical snapshots and their original evidence.

- Find in a normal Markdown Live Preview note includes visible BLP-managed embed occurrences.
- Next/Previous reveals and highlights the match while the Find input retains focus. It does not focus/select an embedded editor or enter its editing state.
- Independent callers of the host editor's searchCursor keep native single-editor semantics, even while Find is open, including when they use the same query as Find.
- Independent queries cannot change the panel query/current participant or invalidate its current embed result.
- Search does not enable cross-editor replacement.

## Final compatibility change

The real editor's searchCursor is no longer wrapped. Before native Find opens, InlineEditEngine attaches a panel-local editor proxy. Only this proxy creates aggregate cursors. Other methods dynamically forward to the real editor with its original receiver, preserving wrappers installed by other plugins. Native cursor creation still calls the current host method, retaining pre-existing plugin wrappers.

Close, mode/lifecycle disposal and plugin unload restore the panel's original editor reference and remove BLP's other search wrappers. A later replacement of the panel editor is not overwritten. If the panel editor cannot be safely replaced, the bridge falls back to native behavior. A retained disposed proxy also falls back to native search.

## Regression evidence

The same-editor/two-caller test failed before the fix (host searchCursor was replaced) and passed afterward. Additional tests cover forwarding with the real receiver, later plugin wrappers, non-writable panel editor, panel replacement during disposal, and partial observer-attach rollback.

Runtime: fresh isolated Obsidian 1.13.6, vault blp12-compat-audit, CDP 19234. Product source state: bf5c5f9 plus the uncommitted BLP-12 fixes. No personal vault or port 9222 was used.

The original conflicting probe now reports:

- Independent embedded-needle search before/during/after Find: 0 / 0 / 0 (previously 0 / 1 / 0).
- Panel query before and after another caller searches host-needle: embedded-needle in both cases.
- Current panel embed result remains valid; the panel cursor is unchanged.
- Three open/close cycles restore editor methods and leave zero search bridges.
- Another note's methods and native search are unchanged.
- Unrelated highlight classes and wrappers installed before/after BLP continue to work.
- Plugin unload with Find open restores editor methods and preserves a later global command wrapper; its independent callback runs once.

Final native UI navigation probe interleaved an external native query before each Next/Previous button click. Result indices were 2/3, 3/3, 1/3, 2/3, 3/3, 1/3, 3/3. Every step retained one highlight, Find input focus, zero focused embedded editors and the same mounted embed roots. Native Escape then closed Find, restored the original editor, preserved the host selection and left zero bridges.

Reproduction files retained in the worktree's debug directory:

- .tmp/blp12-compat-setup.js
- .tmp/blp12-compat-boundaries.js
- .tmp/blp12-compat-lifecycle.js
- .tmp/blp12-final-navigation.js

Build with types and agent workflow checks pass. Existing and added automated tests pass. This proves the tested runtime and simulated cooperative plugin calls; it is not a claim to certify every Obsidian version or third-party plugin combination.

The previous launcher initialization race remains a separate harness observation, outside this bounded product fix. The current control-plane narrative should reference this amendment when BLP-12 is next published; no historical stage approval or Plane state is silently rewritten here.
