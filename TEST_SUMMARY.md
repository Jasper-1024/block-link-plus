# Multi-line Block Rendering Fix Summary

## Problem
Multi-line blocks (`#^id-id` format) lose their content after switching between Reading mode and Live Preview mode in Obsidian.

## Solution Implemented

### 1. MutationObserver for Reading Mode
- Added MutationObserver to the Reading mode post-processor to detect when Obsidian dynamically adds embed elements
- Observer monitors for new nodes, attribute changes (src/alt), and processes them immediately
- This ensures we catch embeds that are loaded asynchronously after the initial processor runs

### 2. Direct Embed Processing
- Modified `replaceMultilineBlocks` to handle cases where the element passed is directly the embed element (common in Reading mode)
- Added `processMultilineEmbed` function to separate the processing logic
- Special handling for when the post-processor receives the embed element directly

### 3. Enhanced DOM Detection
- Added checks for both indirect embeds (child elements) and direct embeds in Reading mode
- Improved logging to track the rendering process with detailed attribute information
- Added multiple fallback strategies to recover link information

### 4. Robust Link Recovery
- Primary: Check `src` attribute
- Fallback 1: Extract from `alt` attribute (format: "filename > ^id")
- Fallback 2: Check `data-href` attribute
- Fallback 3: Check `aria-label` attribute
- Fallback 4: Look for `.markdown-embed-link` child element
- Fallback 5: Reconstruct from content ID if found

### 5. Fixed Element References
- Changed `getCMFromElement` calls to use the correct DOM element reference
- Ensures proper context when looking for CodeMirror instances

## Changes Made

### `/src/features/flow-editor/index.ts`
1. Added comprehensive MutationObserver in Reading mode processor
2. Added direct embed element processing with early return
3. Removed retry mechanism in favor of MutationObserver
4. Enhanced logging for debugging with element state information
5. Added attribute monitoring in MutationObserver

### `/src/basics/flow/markdownPost.tsx`
1. Split `replaceMultilineBlocks` to handle direct embed elements
2. Created `processMultilineEmbed` function for shared logic
3. Fixed element references in `getCMFromElement` calls
4. Enhanced `replaceMarkdownForEmbeds` to handle direct embeds
5. Added multiple fallback strategies for link recovery
6. Enhanced logging to show all attributes and DOM structure

## Testing Instructions

1. Create a note with multi-line blocks using the format: `![[filename#^id-id]]`
2. Switch to Reading mode - blocks should render correctly
3. Switch to Live Preview mode - blocks should remain rendered
4. Switch back to Reading mode - blocks should still be visible
5. Check console logs for detailed debugging information

## Key Improvements

1. **Asynchronous Handling**: MutationObserver ensures we catch embeds loaded after initial render
2. **Direct Processing**: Can now handle embeds passed directly to the processor
3. **Multiple Fallbacks**: Six different strategies to recover link information
4. **Better Error Recovery**: Enhanced src attribute recovery from multiple sources
5. **Cleaner Code**: Separated concerns between finding embeds and processing them
6. **Detailed Logging**: Comprehensive logging shows all attributes and DOM structure

## Debug Information
The enhanced logging now shows:
- src, alt, data-href, aria-label attributes
- Full list of all attributes on the element
- First 200 characters of innerHTML
- Container presence and state
- Recovery method used for link information