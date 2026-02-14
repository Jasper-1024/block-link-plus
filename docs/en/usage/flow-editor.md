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

## Notes

- Legacy `!![[...]]` embeds are no longer supported; use `![[...]]`.
