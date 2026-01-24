export const REGION_START_MARKER_PREFIX = "%% blp-view-start";
export const REGION_END_MARKER = "%% blp-view-end %%";

export interface ManagedRegion {
	regionStartLine: number;
	regionEndLine: number;
	existingHash: string | null;
}

export function findManagedRegion(fileContent: string, codeBlockEndLine: number): ManagedRegion | null {
	const lines = fileContent.split("\n");
	let regionStartLine = -1;
	let regionEndLine = -1;
	let existingHash: string | null = null;

	for (let i = codeBlockEndLine + 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed.startsWith(REGION_START_MARKER_PREFIX)) {
			regionStartLine = i;
			const hashMatch = trimmed.match(/data-hash=\"([^\"]+)\"/);
			if (hashMatch?.[1]) {
				existingHash = hashMatch[1];
			}
			break;
		}
	}

	if (regionStartLine === -1) return null;

	for (let i = regionStartLine + 1; i < lines.length; i++) {
		if (lines[i].trim() === REGION_END_MARKER) {
			regionEndLine = i;
			break;
		}
	}

	if (regionEndLine === -1) return null;

	return { regionStartLine, regionEndLine, existingHash };
}

