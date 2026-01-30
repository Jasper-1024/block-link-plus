// Centralize the non-ASCII marker used by BLP to tag special inline block tokens.
// Keep the source ASCII-friendly (use a unicode escape) to avoid encoding issues.

export const BLP_BLOCK_MARKER = "\u02c5"; // U+02C5

// Regex source string (used by the CM ViewPlugin that styles these markers).
export const BLP_BLOCK_MARKER_RULE = `(^| )${BLP_BLOCK_MARKER}[a-zA-Z0-9_]+$`;
