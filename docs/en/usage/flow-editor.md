# Inline Edit

Edit embedded content directly in Live Preview without jumping to the source file.

## Enable

Settings → Block Link Plus → Inline Edit:
- `inlineEditEnabled` (global)
- `inlineEditFile` / `inlineEditHeading` / `inlineEditBlock`

## Usage

Use standard embeds:

```markdown
![[Note]]
![[Note#Heading]]
![[Note#^blockId]]
![[Note#^startId-endId]]
```

Reading mode is always read-only.

## Notes

- Legacy double-bang embeds are ignored (no inline edit takeover).
