import type { Editor, SectionCache, EditorPosition, CachedMetadata } from 'obsidian';
import type { PluginSettings } from '../../types';
import { generateRandomId, shouldInsertAfter } from '../../utils';

export type MultilineBlockLinkInsertResult =
	| { ok: true; link: string }
	| { ok: false; message: string };

function lineEndsWithBlockId(line: string): boolean {
	return /\s*\^[a-zA-Z0-9-]+\s*$/.test(line);
}

function isLikelyParagraphContinuationLine(line: string): boolean {
	if (!line.trim()) return false;

	// Start of a new Markdown block: treat as NOT a continuation.
	if (/^\s*#{1,6}\s+/.test(line)) return false; // heading
	if (/^\s*>/.test(line)) return false; // blockquote / callout
	if (/^\s*([-*+]|(\d+\.))\s+/.test(line)) return false; // list item
	if (/^\s*(```|~~~)/.test(line)) return false; // fenced code
	if (/^\s*(\|\s*[-:]+|\|)/.test(line)) return false; // table-ish
	if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) return false; // hr
	if (/^\s*%%/.test(line)) return false; // comment block

	return true;
}

/**
 * Generates and inserts a block link for a single line block.
 * If the block already has an ID, returns the existing ID.
 * Otherwise, generates a random ID and inserts it at the end of the block.
 * @param block - The section cache representing the block.
 * @param editor - The editor instance.
 * @returns The ID of the block link.
 */
export function gen_insert_blocklink_singleline(
	block: SectionCache,
	editor: Editor,
	settings: PluginSettings
): string {

	if (block.id) {
		return `^${block.id}`;
	}
	// if block is list, maybe a little complex

	// for https://github.com/Jasper-1024/block-link-plus/issues/9
	// if already has block id, return 
	if (block.type === "list") {
		// Obsidian may treat an entire contiguous list as one "list" section. For
		// correctness, ID reuse MUST be based on the active list item line, not the
		// first line of the list section.
		const activeLine = editor.getCursor("to").line;
		const line = editor.getLine(activeLine);
		const blockIdMatch = line.match(/\s*\^([a-zA-Z0-9-]+)\s*$/);
		if (blockIdMatch) {
			return `^${blockIdMatch[1]}`;
		}
	}
	// for https://github.com/Jasper-1024/block-link-plus/issues/3
	// if block is list, block.position.end will be the end of the list, that may expand selected zone
	const end: EditorPosition = {
		line: block.type === "list" ? editor.getCursor("to").line : block.position.end.line,
		ch: block.type === "list" ? editor.getLine(editor.getCursor("to").line).length : block.position.end.col
	};

	// 处理 heading 的特殊情况
	if (block.type === "heading" && settings.heading_id_newline) {
		const id = generateRandomId(
			settings.enable_prefix ? settings.id_prefix : "",
			settings.id_length
		);

		// 在标题下方插入带空行的 block ID
		editor.replaceRange(
			`\n\n^${id}`,
			{ line: block.position.end.line, ch: block.position.end.col }
		);

		return `^${id}`;
	}

	const id = generateRandomId(
		settings.enable_prefix ? settings.id_prefix : "",
		settings.id_length
	);

	const spacer = shouldInsertAfter(block) ? "\n\n" : " "; // insert to line or next line
	editor.replaceRange(`${spacer}^${id}`, end); // insert block id at end of block
	return `^${id}`;
}

/**
 * Generates and inserts a block link with a multiline heading.
 *
 * @param block - The section cache representing the block.
 * @param editor - The editor instance.
 * @param settings - The plugin settings.
 * @param heading_level - The level of the heading.
 * @returns The generated block ID.
 */
export function gen_insert_blocklink_multline_heading(
	block: SectionCache,
	editor: Editor,
	settings: PluginSettings,
	heading_level: number
) {
	const id = generateRandomId(
		settings.enable_prefix ? settings.id_prefix : "",
		settings.id_length
	);

	const sectionEnd = block.position.end;
	const end: EditorPosition = {
		ch: sectionEnd.col,
		line: sectionEnd.line,
	};

	// const spacer = shouldInsertAfter(block) ? "\n\n" : " "; // insert to line or next line
	const heading = "#".repeat(heading_level); // generate heading
	editor.replaceRange(`\n\n ${heading} ^${id}`, end); // insert block id at end of block

	const cursor = editor.getCursor("from"); // getCursor
	// const lineLength = editor.getLine(cursor.line).length;
	editor.setCursor(cursor.line, cursor.ch);
	editor.replaceRange(`${heading} ˅${id}\n\n`, {
		line: cursor.line,
		ch: 0,
	});

	return `˅${id}`;
}


export function _gen_insert_block_singleline(
	line_num: number,
	editor: Editor,
	settings: PluginSettings
): string {
	// if already has block id, return 
	const line = editor.getLine(line_num);
	const blockIdMatch = line.match(/\s*\^([a-zA-Z0-9-]+)\s*$/);
	if (blockIdMatch) {
		return `^${blockIdMatch[1]}`;
	}

	const end: EditorPosition = {
		line: line_num,
		ch: editor.getLine(line_num).length
	};

	const id = generateRandomId(
		settings.enable_prefix ? settings.id_prefix : "",
		settings.id_length
	);

	const spacer = " "; // insert to line or next line
	editor.replaceRange(`${spacer}^${id}`, end); // insert block id at end of block
	return `^${id}`;
}

/**
 * Generates block links for multiple lines of a block.
 *
 * @param fileCache - The cached metadata of the file.
 * @param editor - The editor instance.
 * @param settings - The plugin settings.
 * @returns An array of block link IDs or an empty string.
 */
export function gen_insert_blocklink_multline_block(
	fileCache: CachedMetadata,
	editor: Editor,
	settings: PluginSettings
): string[] | string {
	if (fileCache.sections == null && fileCache.listItems == null) return "";

	const start_line = editor.getCursor("from").line;
	const end_line = editor.getCursor("to").line;

	let links = new Array<string>();

	const rangesIntersect = (
		aStart: number,
		aEnd: number,
		bStart: number,
		bEnd: number
	): boolean => {
		return aStart <= bEnd && bStart <= aEnd;
	};

	type SelectedTarget =
		| { kind: "section"; startLine: number; endLine: number; section: SectionCache }
		| { kind: "listItem"; startLine: number; endLine: number; line: number };

	const selectedTargets: SelectedTarget[] = [];

	// Prefer listItems when available so we operate on list items (not raw lines).
	if (fileCache.listItems) {
		for (const item of fileCache.listItems) {
			const itemStart = item.position.start.line;
			const itemEnd = item.position.end.line;
			if (!rangesIntersect(itemStart, itemEnd, start_line, end_line)) continue;
			selectedTargets.push({
				kind: "listItem",
				startLine: itemStart,
				endLine: itemEnd,
				// Obsidian only indexes list-item block IDs reliably at the end of the item
				// (after all continuation lines), so insert at the item end line.
				line: itemEnd,
			});
		}
	}

	if (fileCache.sections) {
		const sortedSections = [...fileCache.sections].sort(
			(a, b) => a.position.start.line - b.position.start.line
		);

		for (const section of sortedSections) {
			// section is out of the [start_line, end_line]
			if (!rangesIntersect(section.position.start.line, section.position.end.line, start_line, end_line)) {
				continue;
			}

			// List sections are handled via listItems above (when available).
			if (section.type === "list") {
				if (!fileCache.listItems) {
					// Fallback: treat each selected line as a separate target.
					const _start_line = Math.max(section.position.start.line, start_line);
					const _end_line = Math.min(section.position.end.line, end_line);
					for (let i = _start_line; i <= _end_line; i++) {
						const id = _gen_insert_block_singleline(i, editor, settings);
						links.push(id);
					}
				}
				continue;
			}

			selectedTargets.push({
				kind: "section",
				startLine: section.position.start.line,
				endLine: section.position.end.line,
				section,
			});
		}
	}

	const seen = new Set<string>();
	const uniqueTargets = selectedTargets
		.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine)
		.filter((target) => {
			const key =
				target.kind === "listItem"
					? `listItem:${target.startLine}:${target.endLine}`
					: `section:${target.startLine}:${target.endLine}:${target.section.type}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

	for (const target of uniqueTargets) {
		if (target.kind === "listItem") {
			const id = _gen_insert_block_singleline(target.line, editor, settings);
			links.push(id);
		} else {
			const id = gen_insert_blocklink_singleline(target.section, editor, settings);
			links.push(id);
		}
	}

	return links;
}

/**
 * Generates and inserts a multiline block reference with ^xyz-xyz format.
 * Creates a range block that can be referenced with ![[file#^xyz-xyz]].
 * 
 * @param editor - The editor instance.
 * @param settings - The plugin settings.
 * @returns The generated multiline block link in format "^xyz-xyz".
 */
export function gen_insert_blocklink_multiline_block(
	fileCache: CachedMetadata,
	editor: Editor,
	settings: PluginSettings
): MultilineBlockLinkInsertResult {
	const cursorFrom = editor.getCursor("from");
	const cursorTo = editor.getCursor("to");

	const startLine = Math.min(cursorFrom.line, cursorTo.line);
	const endLine = Math.max(cursorFrom.line, cursorTo.line);

	if (startLine === endLine) {
		return { ok: false, message: "Selection must span multiple lines" };
	}

	const frontmatterEndLine = fileCache.frontmatter?.position?.end?.line;
	if (typeof frontmatterEndLine === "number" && startLine <= frontmatterEndLine) {
		return { ok: false, message: "Selection cannot include frontmatter" };
	}

	if (startLine === 0) {
		try {
			if (!editor.getLine(0).trim()) {
				return { ok: false, message: "Selection cannot start at an empty first line" };
			}
		} catch {
			// If we can't read the first line reliably, fail safe.
			return { ok: false, message: "Selection is invalid" };
		}
	}
	
	// Generate unique ID (6 character alphanumeric)
	let id: string;
	const fullText = editor.getValue();
	do {
		id = generateRandomId("", 6); // Always 6 chars for multiline blocks, no prefix
	} while (fullText.includes(`^${id}`)); // Ensure uniqueness across entire document

	const pickListItemForLine = (line: number) => {
		const listItems = fileCache.listItems;
		if (!listItems) return null;
		let best: { start: number; end: number } | null = null;
		for (const item of listItems) {
			const s = item.position.start.line;
			const e = item.position.end.line;
			if (s <= line && line <= e) {
				if (!best || e - s < best.end - best.start) {
					best = { start: s, end: e };
				}
			}
		}
		return best;
	};

	const startListItem = pickListItemForLine(startLine);
	const endListItem = pickListItemForLine(endLine);

	const startInsertLine = startListItem ? startListItem.end : startLine;
	const endInsertLine = endListItem ? endListItem.end : endLine;

	const startInsertText = editor.getLine(startInsertLine);
	if (lineEndsWithBlockId(startInsertText)) {
		return { ok: false, message: "Start line already has a block ID" };
	}

	const endInsertText = editor.getLine(endInsertLine);
	if (lineEndsWithBlockId(endInsertText)) {
		return { ok: false, message: "End line already has a block ID" };
	}
	
	// Get the start insertion line content
	const firstLine = startInsertText;
	let newFirstLine: string;

	if (firstLine.trim() === '') {
		// Handle empty line with comment syntax
		newFirstLine = `%% %% ^${id}`;
	} else {
		// Add marker to end of existing content
		newFirstLine = `${firstLine} ^${id}`;
	}

	const endSection = (fileCache.sections || []).find((section) => {
		return section.position.start.line <= endInsertLine && section.position.end.line >= endInsertLine;
	});

	const endMarker = `^${id}-${id}`;
	const endMarkerInlineSafe =
		startInsertLine !== endInsertLine &&
		Boolean(endInsertText.trim()) &&
		!(endSection && shouldInsertAfter(endSection));

	const originalCursorFrom = editor.getCursor("from");
	const originalCursorTo = editor.getCursor("to");
	const originalValue = fullText;

	try {
		// Replace the first line with the marked version.
		editor.replaceRange(
			newFirstLine,
			{ line: startInsertLine, ch: 0 },
			{ line: startInsertLine, ch: firstLine.length }
		);

		if (endMarkerInlineSafe) {
			const currentEndLineText = editor.getLine(endInsertLine);
			const endPos: EditorPosition = { line: endInsertLine, ch: currentEndLineText.length };
			editor.replaceRange(` ${endMarker}`, endPos);
		} else {
			const insertEndMarkerAsListItemContinuation =
				Boolean(endListItem) && startInsertLine === endInsertLine;
			const insertAfterLine =
				insertEndMarkerAsListItemContinuation
					? endInsertLine
					: endSection && (shouldInsertAfter(endSection) || endSection.type === "list")
					? endSection.position.end.line
					: endInsertLine;
			const insertAfterText = editor.getLine(insertAfterLine);
			const insertAfterPos: EditorPosition = { line: insertAfterLine, ch: insertAfterText.length };

			let nextLineText = "";
			try {
				nextLineText = editor.getLine(insertAfterLine + 1) ?? "";
			} catch {
				nextLineText = "";
			}

			const needsBlankLineAfterMarker = isLikelyParagraphContinuationLine(nextLineText);

			let markerLine = endMarker;
			if (insertEndMarkerAsListItemContinuation) {
				const indent = editor.getLine(endInsertLine).match(/^\s*/)?.[0] ?? "";
				markerLine = `${indent}${endMarker}`;
			}

			const insertText = needsBlankLineAfterMarker ? `\n${markerLine}\n` : `\n${markerLine}`;
			editor.replaceRange(insertText, insertAfterPos);
		}

		return { ok: true, link: endMarker };
	} catch {
		// Best-effort rollback: restore the editor to its previous state.
		try {
			editor.setValue(originalValue);
			editor.setSelection(originalCursorFrom, originalCursorTo);
		} catch {
			// ignore
		}
		return { ok: false, message: "Failed to create multiline block" };
	}
} 
