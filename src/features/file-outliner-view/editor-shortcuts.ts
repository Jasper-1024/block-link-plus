export function isPlainTextPasteShortcut(evt: KeyboardEvent): boolean {
	const key = String((evt as any)?.key ?? "").toLowerCase();
	if (key !== "v") return false;

	// `Mod` is Ctrl on Windows/Linux, Command on macOS.
	const mod = Boolean((evt as any)?.ctrlKey) || Boolean((evt as any)?.metaKey);
	if (!mod) return false;

	// We only treat the canonical "paste as plain text" chord as special:
	// Mod+Shift+V (ignore Alt/Option variants).
	return Boolean((evt as any)?.shiftKey) && !Boolean((evt as any)?.altKey);
}

export function toggleTaskMarkerPrefix(firstLine: string): string {
	const line = String(firstLine ?? "");

	if (line.startsWith("[ ] ")) return `[x] ${line.slice(4)}`;
	if (line.startsWith("[x] ") || line.startsWith("[X] ")) return `[ ] ${line.slice(4)}`;

	return `[ ] ${line}`;
}

