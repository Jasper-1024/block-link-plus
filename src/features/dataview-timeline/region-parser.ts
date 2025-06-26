export const REGION_START_MARKER_PREFIX = "<!-- blp-timeline-start";
export const REGION_END_MARKER = "<!-- blp-timeline-end -->";

export interface DynamicRegion {
    regionStartLine: number;
    regionEndLine: number;
    currentContent: string;
    existingHash: string | null;
}

export function findDynamicRegion(fileContent: string, codeBlockEndLine: number): DynamicRegion | null {
    const lines = fileContent.split('\n');
    let regionStartLine = -1;
    let regionEndLine = -1;
    let existingHash: string | null = null;

    // Search for start marker after the code block
    for (let i = codeBlockEndLine + 1; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine.startsWith(REGION_START_MARKER_PREFIX)) {
            regionStartLine = i;
            const hashMatch = trimmedLine.match(/data-hash="([^"]+)"/);
            if (hashMatch && hashMatch[1]) {
                existingHash = hashMatch[1];
            }
            break;
        }
    }

    if (regionStartLine === -1) {
        return null; // Start marker not found
    }

    // Search for end marker after the start marker
    for (let i = regionStartLine + 1; i < lines.length; i++) {
        if (lines[i].trim() === REGION_END_MARKER) {
            regionEndLine = i;
            break;
        }
    }

    if (regionEndLine === -1) {
        // If no end marker, maybe create one? For now, let's treat as not found.
        return null;
    }

    const currentContent = lines.slice(regionStartLine + 1, regionEndLine).join('\n');

    return {
        regionStartLine,
        regionEndLine,
        currentContent,
        existingHash
    };
} 