// Centralize the non-ASCII marker used by BLP to tag special inline block tokens.
// Keep the source ASCII-friendly (use a unicode escape) to avoid encoding issues.

export const BLP_BLOCK_MARKER = "\u02c5"; // U+02C5

// CM6 mark class used to style inline marker tokens (Live Preview).
export const BLP_BLOCK_MARKER_CLASS = "blp-block-marker";

// Regex source string (used by the CM ViewPlugin that styles these markers).
// NOTE: allow '-' so ids like "prefix-abc123" (generated when prefix is enabled) are styled.
export const BLP_BLOCK_MARKER_RULE = `(^| )${BLP_BLOCK_MARKER}[a-zA-Z0-9_-]+$`;
