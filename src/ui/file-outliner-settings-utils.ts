export function dedupeKeepOrder(items: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of items) {
		if (seen.has(item)) continue;
		seen.add(item);
		out.push(item);
	}
	return out;
}

export function normalizePluginId(raw: string): string {
	return String(raw ?? "").trim().toLowerCase();
}

