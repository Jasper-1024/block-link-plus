# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: 🏗️DEVELOPMENT | Ω: RESEARCH*

## 🔮 Current Focus
Fixing React unmounting error when switching from Reading Mode to Live Preview for multiline blocks.

## 📎 Context References
- 📄 Active Files: 
  - src/basics/flow/markdownPost.tsx (React root management)
  - src/basics/ui/UIMultilineBlock.tsx (Component structure)
  - src/features/flow-editor/index.ts (Mode switching)
- 💻 Active Code: processMultilineEmbed, UIMultilineBlock, cleanupMultilineBlocks
- 📚 Active Docs: /block folder (reference implementation)
- 📁 Active Folders: src/basics/flow, src/basics/ui
- 🔄 Git References: None
- 📏 Active Rules: Research mode - no code generation without analysis

## 📡 Context Status
- 🟢 Active: React unmounting fix implementation
- 🟡 Partially Relevant: Mode switching behavior
- 🟣 Essential: DOM structure preservation for React
- 🔴 Deprecated: Direct parent DOM manipulation approach

## 🔄 Recent Changes
### 2024-12-20 - React Unmounting Fix
**Problem**: "Failed to execute 'removeChild' on 'Node'" error when switching modes
**Root Cause**: UIMultilineBlock was manipulating its parent DOM directly, breaking React's expectations
**Solution**: 
1. Create dedicated container div for React (`mk-multiline-react-container`)
2. Update UIMultilineBlock to render into its own container
3. Move embed element class manipulation to use closest() selector
4. Improve cleanup function with proper error handling

**Key Changes**:
- markdownPost.tsx: Create reactContainer div for React root
- UIMultilineBlock.tsx: Use own container instead of parent manipulation
- cleanupMultilineBlocks: Add graceful unmount with error handling

## 🎯 Next Steps
1. Test the fix with mode switching scenarios
2. Verify multiline block rendering still works correctly
3. Check for any CSS styling issues with new container structure
4. Monitor for any new console errors

## 🔮 Future Considerations
- Consider implementing a more robust React lifecycle management system
- Evaluate if WeakMap would be better for storing React roots
- Look into using React portals for better DOM isolation