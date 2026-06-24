## 1. Spec & Settings
- [x] 1.1 Add spec deltas for File Outliner editor command bridge + strict allowlist
- [x] 1.2 Add spec deltas for Settings UI (command allowlist + copy action)
- [x] 1.3 Validate openspec change (`openspec validate add-file-outliner-editor-command-bridge --strict`)

## 2. Implementation
- [x] 2.1 Add new settings keys + defaults + settings migration (if needed)
- [x] 2.2 Add Settings UI for command allowlist + copy from context-menu allowlist
- [x] 2.3 Implement Outliner `activeEditor` bridge (scoped to Outliner block editing)
- [x] 2.4 Implement strict allowlist gate for editor commands while bridge is active
- [x] 2.5 Ensure best-effort behavior (blocked commands no-op; errors don't break editing)

## 3. Tests
- [x] 3.1 Unit tests for allowlist parsing + command ownership attribution + gate decision
- [x] 3.2 Unit tests for settings defaults and i18n strings
- [x] 3.3 Add 9222/CDP regression snippet validating:
  - core editor command works in Outliner (e.g. `editor:toggle-bold`)
  - non-allowlisted plugin editor command is blocked
  - allowlisted plugin editor command is allowed
- [x] 3.4 Run build + unit tests and ensure pass

## 4. Docs
- [x] 4.1 Update settings reference docs (3 languages) for new Outliner command allowlist
- [x] 4.2 Add a short note to Outliner docs about supported plugin type and strict allowlist behavior
