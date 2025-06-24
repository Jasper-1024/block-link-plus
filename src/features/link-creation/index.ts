import type { Editor, SectionCache, EditorPosition, CachedMetadata } from 'obsidian';
import type { PluginSettings } from '../../types';
import { generateRandomId, shouldInsertAfter } from '../../utils';

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
		const line = editor.getLine(block.position.start.line);
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
			settings.enble_prefix ? settings.id_prefix : "",
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
		settings.enble_prefix ? settings.id_prefix : "",
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
		settings.enble_prefix ? settings.id_prefix : "",
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
		settings.enble_prefix ? settings.id_prefix : "",
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
	if (fileCache.sections == null) return "";

	const start_line = editor.getCursor("from").line;
	const end_line = editor.getCursor("to").line;

	const sortedSections = [...fileCache.sections].sort(
		(a, b) => a.position.start.line - b.position.start.line
	);
	let links = new Array<string>();

	for (const section of sortedSections) {
		// section is out of the [start_line, end_line]
		if (section.position.start.line > end_line || section.position.end.line < start_line) continue;

		// list type is special
		if (section.type === "list") {
			let _start_line = Math.max(section.position.start.line, start_line);
			let _end_line = Math.min(section.position.end.line, end_line);
			for (let i = _start_line; i <= _end_line; i++) {
				const id = _gen_insert_block_singleline(i, editor, settings);
				links.push(id);
			}
		} else {
			// section is in the [start_line, end_line]
			if (
				section.position.start.line >= start_line &&
				section.position.end.line <= end_line
			) {
				const id = gen_insert_blocklink_singleline(
					section,
					editor,
					settings
				);
				links.push(id);
			}
		}
	}

	return links;
} 