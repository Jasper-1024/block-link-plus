# Domain Docs

BLP uses a single-context domain layout.

Engineering agents should read:

- `CONTEXT.md` for project vocabulary.
- Relevant ADRs in `docs/adr/` when a decision touches architecture,
  workflow, runtime validation, or hard-to-reverse boundaries.
- Relevant existing specs or docs only when the active stage asks for them.

Use the glossary vocabulary in issue titles, Plane replies, test names, PRDs,
diagnosis artifacts, and implementation notes. If a needed concept is missing,
resolve it with `grill-with-docs` before implementation.

Do not use `CONTEXT.md` as a scratchpad, design note, or implementation spec.
It is only the shared project language.
