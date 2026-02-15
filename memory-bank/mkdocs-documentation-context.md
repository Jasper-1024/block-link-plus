# MkDocs Multi-language Documentation Context
*Created: 2025-07-12 | Status: PARTIALLY COMPLETE*

> Status (2026-02 / v2.0.0): Public docs have been updated for the current mainline (Outliner + `blp-view` + Inline Edit + Block Links). Timeline / Time Section are removed in v2.0.0; older notes here are historical.

## Current Task
Creating comprehensive multi-language documentation for Obsidian Block Link Plus plugin using MkDocs + GitHub Pages.

## Technical Details
- **Plugin**: Block Link Plus for Obsidian
- **Main Innovation**: ^abc123-abc123 multi-line block references
- **Architecture**: TypeScript + React + CodeMirror 6
- **Key Features**: Outliner (Logseq-like) + `blp-view`, multi-line ranges, inline edit, smart aliases

## Documentation Progress
1. ✅ Code analysis completed
2. ✅ Chinese documentation written (concise, no-fluff style per user requirement)
3. ✅ MkDocs configuration with Material theme + mkdocs-static-i18n
4. ✅ Complete translations: Chinese (14 pages), Traditional Chinese (14 pages), English (14 pages)
5. ✅ Navigation translation partially working
6. ❌ **UNRESOLVED ISSUES**: Cross-language navigation bugs

## Current MkDocs Configuration
```yaml
# Working configuration in mkdocs.yml
nav: English labels (Home, Installation, User Guide, etc.)
plugins:
  - i18n:
      docs_structure: suffix
      fallback_to_default: false
      languages:
        - locale: zh (default: true, with nav_translations to Chinese)
        - locale: en 
        - locale: zh-TW (with nav_translations to Traditional Chinese)
```

## Multi-language URLs
- Chinese (default): http://localhost:8000/obsidian-block-link-plus/
- English: http://localhost:8000/obsidian-block-link-plus/en/
- Traditional Chinese: http://localhost:8000/obsidian-block-link-plus/zh-TW/

## Known Bugs (User: "完全不对还是有bug")
1. **Language switcher URL generation**: Sometimes generates wrong URLs (/zh/ instead of /)
2. **Navigation link consistency**: Navigation links may not preserve language context
3. **mkdocs-static-i18n limitations**: Plugin has issues with nav_translations feature
4. **Mixed language elements**: Some pages show inconsistent language in navigation

## Files Structure
- `/mkdocs.yml`: Main config with i18n setup
- `/docs/`: Chinese documentation (14 pages complete)
- `/docs/en/`: English translations (14 pages complete)  
- `/docs/zh-TW/`: Traditional Chinese translations (14 pages complete)
- `/README.md`: Updated with complete changelog restored
- MkDocs serving on http://localhost:8000/obsidian-block-link-plus/

## User Feedback Summary
- Writing style: "不要自吹自擂.... 也别多说废话" (no self-promotion, no fluff)
- Translation quality: "按照中文版本 完整的翻译, 不要凑活" (complete translations required)
- Navigation issues: Language switching and cross-page navigation still buggy

## Technical Challenges
- mkdocs-static-i18n plugin's nav_translations feature has inconsistent behavior
- Language switcher generates incorrect URLs for default language
- Cross-language navigation loses language context on page transitions
- Need alternative solution or plugin configuration fix

## Next Session Priority
Fix the multi-language navigation consistency issues to complete the documentation system.
