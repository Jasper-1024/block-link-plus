# Inline Edit

Edit embedded content directly in Live Preview without jumping to the source file.

## Enable

Settings → Block Link Plus → Inline Edit:
- `inlineEditEnabled` (global)
- `inlineEditFile` / `inlineEditHeading` / `inlineEditBlock`

You can also run `Toggle Inline Edit` (`mk-flow-editor`) from the Command Palette to quickly toggle `inlineEditEnabled`.

## Usage

Use standard embeds:

```markdown
![[Note]]
![[Note#Heading]]
![[Note#^blockId]]
![[Note#^id-id]]
```

Reading mode is always read-only.

## Find in the current note

With Inline Edit enabled, press `Ctrl+F` (`Cmd+F` on macOS) in a normal Markdown note's Live Preview to search the note and mounted Inline Edit embeds, including block, heading, and file embeds.

- Use the Find bar's previous/next controls. Embedded matches scroll and highlight without entering edit mode or opening the source note.
- Focus stays in Find so you can keep typing. `Escape` closes Find and clears its highlights.
- This is current-note Find, not vault-wide search or Outliner search. Reading View keeps Obsidian's existing behavior.

## Notes

- Legacy `!![[...]]` embeds are no longer supported; use `![[...]]`.
