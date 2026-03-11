function isModKeyPressed(evt: KeyboardEvent): boolean {
	return Boolean((evt as any)?.ctrlKey) || Boolean((evt as any)?.metaKey);
}

export function isPlainTextPasteShortcut(evt: KeyboardEvent): boolean {
	const key = String((evt as any)?.key ?? "").toLowerCase();
	if (key !== "v") return false;
	if (!isModKeyPressed(evt)) return false;

	// We only treat the canonical "paste as plain text" chord as special:
	// Mod+Shift+V (ignore Alt/Option variants).
	return Boolean((evt as any)?.shiftKey) && !Boolean((evt as any)?.altKey);
}

export function isUndoShortcut(evt: KeyboardEvent): boolean {
	const key = String((evt as any)?.key ?? "").toLowerCase();
	return key === "z" && isModKeyPressed(evt) && !Boolean((evt as any)?.shiftKey) && !Boolean((evt as any)?.altKey);
}

export function isRedoShortcut(evt: KeyboardEvent): boolean {
	const key = String((evt as any)?.key ?? "").toLowerCase();
	if (!isModKeyPressed(evt) || Boolean((evt as any)?.altKey)) return false;
	return key === "y" || (key === "z" && Boolean((evt as any)?.shiftKey));
}
