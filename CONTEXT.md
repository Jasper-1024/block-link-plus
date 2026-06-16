# Block Link Plus Context

Block Link Plus is an Obsidian plugin for creating, rendering, navigating, and
editing block-oriented references inside Markdown notes. This file defines the
project language agents should use in issue briefs, tests, PRDs, diagnosis
notes, and implementation plans.

## Language

**Block Link**:
A Markdown link or embed that targets a stable block, heading, or range inside a
note. _Avoid_: generic link, magic link.

**Block Reference**:
The Obsidian target identity behind a block link, usually represented by a
block id, heading anchor, or range marker. _Avoid_: raw anchor when the behavior
is about the resolved target.

**Inline Edit Embed**:
An embedded block preview that Block Link Plus temporarily turns into an
editable Live Preview surface. _Avoid_: editable preview, embedded editor.

**Embed Shell**:
The BLP-owned wrapper around an inline edit embed. It may host native Obsidian
embed affordances, BLP controls, and the editable CodeMirror surface. _Avoid_:
container when the wrapper has behavior.

**Jump Affordance**:
The visible native Obsidian control that lets a user jump from an embed to its
source block or file. _Avoid_: link icon, navigation button.

**File Outliner**:
The BLP view that presents a note as a structured outline and supports
outliner-specific navigation or editing. _Avoid_: outline panel when referring
to this feature.

**Enhanced List Blocks**:
The BLP feature family that gives list items block-like operations, handles, or
selection semantics. _Avoid_: list mode when the behavior is block-oriented.

**Journal Feed**:
The BLP view that aggregates date-oriented note content into a feed. _Avoid_:
timeline unless the behavior is specifically about the retired timeline feature.

**CDP Runtime**:
An isolated Obsidian desktop runtime controlled through Chrome DevTools
Protocol for evidence gathering and validation. _Avoid_: browser test when the
assertion depends on the Obsidian app.

**Agent Run**:
One tracked task execution under `docs/agent/runs/<key>/`, including canonical
stage artifacts and raw trace material. _Avoid_: chat log when referring to the
repo-local audit archive.
