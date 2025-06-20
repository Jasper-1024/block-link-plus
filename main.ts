import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	HeadingCache,
	ListItemCache,
	SectionCache,
	EditorPosition,
	MarkdownFileInfo,
	Menu,
	CachedMetadata,
} from "obsidian";

import {
	Decoration,
	MatchDecorator,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { Extension, RangeSet } from "@codemirror/state";
import { assert } from "console";
import { inflate } from "zlib";
// import { RangeSet } from "@codemirror/state";

const MAX_ALIAS_LENGTH = 100;

type HeadingAnalysisResult = {
	isValid: boolean; // 是否有效
	start_line: number; // 选中文本的开始行
	end_line: number; // 选中文本的结束行
	isMultiline: boolean; // 是否是多行选中
	block: SectionCache | null; // 暂时for single line
	nearestBeforeStartLevel: number; // 距离 start_line 最近的 heading 的 level
	minLevelInRange: number; // [start_line, end_line] 范围内的最小 heading level
	hasHeadingAtStart: boolean; // 是否有 heading 的 start.line 正好是 start_line
	hasHeadingAtEnd: boolean; // 是否有 heading 的 start.line 正好是 end_line
	headingAtStart: HeadingCache | null; // 在 start_line 处的 heading | 仅在 hasHeadingAtStart 为 true 时有效
	headingAtEnd: HeadingCache | null; // 在 end_line 处的 heading | 仅在 hasHeadingAtEnd 为 true 时有效
	isStartHeadingMinLevel: boolean; //	headingAtStart 是否是最小其唯一 level 的 heading | 仅在 hasHeadingAtStart 为 true 时有效
	isEndLineJustBeforeHeading: boolean; // end_line 是否正好是某个 heading 的 start.line - 1
	blockContent: string | null;        // 处理后的块内容
	nearestHeadingTitle: string | null; // 最近的标题内容
	selectedText: string | null; // 选中的文本
	blockText: string | null; // 选中的块内容
};

export const enum MultLineHandle {
	oneline, // as one line handle
	heading, // add new heading, if select text contain not heading
	multblock, // add new block, if select text contain not block
}

export const enum BlockLinkAliasType {
	Default, // no alias
	FirstChars, // first x characters of block content
	Heading, // alias as heading
	SelectedText // alias as selected text
}

export type KeysOfType<Obj, Type> = {
	[k in keyof Obj]: Obj[k] extends Type ? k : never;
}[keyof Obj];

type BlockLinkPlusViewPlugin = ViewPlugin<{
	decorations: RangeSet<Decoration>;
	update(u: ViewUpdate): void;
}>;

interface PluginSettings {
	mult_line_handle: MultLineHandle;
	alias_type: BlockLinkAliasType;
	enable_right_click_block: boolean;
	enable_right_click_embed: boolean;
	enable_right_click_url: boolean;
	alias_length: number;
	enble_prefix: boolean;
	id_prefix: string;
	id_length: number;
	heading_id_newline: boolean;
	enable_block_notification: boolean;
	enable_embed_notification: boolean;
	enable_url_notification: boolean;
	// Time Section
	enable_time_section: boolean;
	time_section_format: string;
	daily_note_pattern: string;
	insert_heading_level: boolean;
	daily_note_heading_level: number;
	enable_time_section_in_menu: boolean;
	time_section_plain_style: boolean; // Controls whether time sections should be displayed as plain text
}

const DEFAULT_SETTINGS: PluginSettings = {
	mult_line_handle: MultLineHandle.oneline, // as one line handle
	alias_type: BlockLinkAliasType.Default, // no alias
	enable_right_click_block: true,
	enable_right_click_embed: true,
	enable_right_click_url: false,
	alias_length: 20,
	enble_prefix: false, // no prefix
	id_prefix: "", // prefix
	id_length: 4, // id length
	heading_id_newline: false,
	enable_block_notification: true,
	enable_embed_notification: true,
	enable_url_notification: true,
	// Time Section
	enable_time_section: true,
	time_section_format: "HH:mm",
	daily_note_pattern: "\\d{4}-\\d{1,2}-\\d{1,2}",
	insert_heading_level: true,
	daily_note_heading_level: 2,
	enable_time_section_in_menu: false,
	time_section_plain_style: false, // Default to standard heading style
};

/**
 * Generates a random ID with the specified prefix and length.
 *
 * @param prefix - The prefix to be added to the ID (optional).
 * @param length - The length of the random ID. Must be between 3 and 7 (inclusive).
 * @returns The generated random ID.
 * @throws Error if the length is not between 3 and 7.
 */
function generateRandomId(prefix: string, length: number): string {
	if (length < 3 || length > 7) {
		throw new Error("Length must be between 3 and 7.");
	}
	const separator = prefix ? "-" : "";
	return `${prefix}${separator}${Math.random()
		.toString(36)
		.substring(2, 2 + length)}`;
}

/**
 * Determines whether a block should be inserted at next line.
 *
 * @param block - The block to check.
 * @returns `true` if the block should be inserted after, `false` otherwise.
 */
function shouldInsertAfter(block: ListItemCache | SectionCache) {
	if ((block as any).type) {
		return [
			"blockquote",
			"code",
			"table",
			"comment",
			"footnoteDefinition",
		].includes((block as SectionCache).type);
	}
}

/**
 * Format current time to specified format
 * @param format Time format, e.g. "HH:mm"
 * @returns Formatted time string
 */
function formatCurrentTime(format: string): string {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	
	// 简单的格式替换
	return format
		.replace('HH', hours)
		.replace('mm', minutes);
}

/**
 * Check if a text is a time section heading
 * @param text Text to check
 * @param format Time format to match (default: HH:mm)
 * @returns Whether the text is a time section
 */
function isTimeSection(text: string, format: string = "HH:mm"): boolean {
	// Heading pattern: #+ HH:mm
	// This regex matches strings like "## 19:19" or "# 09:05"
	const regex = new RegExp(`^(#{1,6})\\s+(\\d{1,2}:\\d{1,2})$`);
	return regex.test(text);
}

/**
 * Check if the file name matches the daily note format
 * @param fileName File name
 * @param pattern Daily note regex pattern
 * @returns Whether it is a daily note
 */
function isDailyNote(fileName: string, pattern: string): boolean {
	console.log(`isDailyNote checking: fileName="${fileName}", pattern="${pattern}"`);
	try {
		const regex = new RegExp(pattern);
		const isMatch = regex.test(fileName);
		// console.log(`isDailyNote result: ${isMatch ? "MATCH" : "NO MATCH"}`);
		return isMatch;
	} catch (e) {
		console.error("Invalid regex pattern for daily note:", e);
		return false;
	}
}

/**
 * handle single line content
 * @param line original line content
 * @returns processed line content
 */
function processLineContent(line: string): string {
	// empty line
	if (!line.trim()) return '';

	// remove HTML tags
	line = line.replace(/<[^>]+>/g, '');

	// handle list mark
	line = line.replace(/^[\s]*[-*+]\s+/, '');
	line = line.replace(/^[\s]*\d+\.\s+/, '');

	// handle block quote
	line = line.replace(/^[\s]*>+\s*/, '');

	// handle block id at end of line
	line = line.replace(/\s*\^[a-zA-Z0-9-]+$/, '');

	// replace newlines with spaces
	line = line.replace(/\n/g, ' ');

	return line.trim();
}

/**
 * handle multi line content
 * @param editor - The editor instance
 * @param start_line - The starting line number
 * @param end_line - The ending line number
 * @param alias_length - The maximum length of alias
 * @returns processed content
 */
function processMultiLineContent(
	editor: Editor,
	start_line: number,
	end_line: number,
	alias_length: number
): string {
	// find first non empty line as real start line
	let currentLine = start_line;
	while (currentLine <= end_line) {
		const line = editor.getLine(currentLine);
		// 去掉行尾的 block id
		const lineWithoutBlockId = line.replace(/\s*\^[a-zA-Z0-9-]+$/, '');

		if (!lineWithoutBlockId.trim()) {
			currentLine++;
			continue;
		}
		// handle special format line
		if (lineWithoutBlockId.startsWith('|-') || lineWithoutBlockId.startsWith('```')) {
			// if table separator or code block start, jump to next line
			currentLine++;
			if (currentLine <= end_line) {
				const nextLine = editor.getLine(currentLine);
				// if code block language identifier, jump to next line
				if (nextLine.match(/^```\w+$/)) {
					currentLine++;
				}
			}
			continue;
		}

		// handle current line content
		const processedContent = processLineContent(lineWithoutBlockId);
		if (processedContent) {
			// if processed content is not empty, return processed content (limit length)
			return processedContent.slice(0, alias_length);
		}

		currentLine++;
	}

	// if all lines are empty, return empty string
	return '';
}

/**
 * Analyzes the headings within a specified range of lines in a file.
 *
 * @param fileCache - The cached metadata of the file.
 * @param editor - The editor instance.
 * @param start_line - The starting line of the range.
 * @param end_line - The ending line of the range.
 * @returns The analysis result of the headings within the specified range.
 */
function analyzeHeadings(
	fileCache: CachedMetadata,
	editor: Editor,
	start_line: number,
	end_line: number
): HeadingAnalysisResult {
	if (start_line === 0 && end_line === 0) {
		console.log("block-link-plus: analyzeHeadings: start_line === 0 && end_line === 0");
		return {
			isValid: false,
			start_line,
			end_line,
			isMultiline: false,
			block: null,
			nearestBeforeStartLevel: 0,
			minLevelInRange: Infinity,
			hasHeadingAtStart: false,
			hasHeadingAtEnd: false,
			headingAtStart: null,
			headingAtEnd: null,
			isStartHeadingMinLevel: false,
			isEndLineJustBeforeHeading: false,
			blockContent: null,
			nearestHeadingTitle: null,
			selectedText: null,
			blockText: null,
		};
	}

	if (!fileCache || end_line < start_line) {
		return {
			isValid: false,
			start_line,
			end_line,
			isMultiline: false,
			block: null,
			nearestBeforeStartLevel: 0,
			minLevelInRange: Infinity,
			hasHeadingAtStart: false,
			hasHeadingAtEnd: false,
			headingAtStart: null,
			headingAtEnd: null,
			isStartHeadingMinLevel: false,
			isEndLineJustBeforeHeading: false,
			blockContent: null,
			nearestHeadingTitle: null,
			selectedText: null,
			blockText: null,
		};
	}

	let closestBeforeStartDistance = Infinity; // record the closest heading distance at [0, start_line)
	let nearestHeadingTitle: string | null = null;
	let selectedText = editor.getSelection();
	let blockText = editor.getRange({ line: start_line, ch: 0 }, { line: end_line, ch: editor.getLine(end_line).length });

	// console.log("analyzeHeadings", fileCache, start_line, end_line); // debug
	// one line
	if (start_line == end_line) {
		let head_block: HeadingCache | undefined = fileCache.headings?.find(
			(heading) => {
				const { start, end } = heading.position;
				return start.line == start_line;
			}
		);

		let block = (fileCache.sections || []).find((section) => {
			return (
				section.position.start.line <= end_line &&
				section.position.end.line >= end_line
			);
		})!;

		const blockContent = block ? processLineContent(editor.getLine(start_line)) : null;
		
		// 添加与多行分析类似的逻辑来计算 nearestBeforeStartLevel
		let nearestBeforeStartLevel = 0;
		let closestBeforeStartDistance = Infinity;
		
		fileCache.headings?.forEach((heading) => {
			const { start, end } = heading.position;
			// 对于 start.line 在 (0, start_line) 开区间的处理
			if (start.line < start_line) {
				// 跳过以 ^ 或 ˅ 开头的标题
				if (heading.heading.startsWith('^') || heading.heading.startsWith('˅')) {
					return;
				}
				const distance = start_line - start.line;
				if (distance < closestBeforeStartDistance) {
					closestBeforeStartDistance = distance;
					nearestBeforeStartLevel = heading.level;
					nearestHeadingTitle = heading.heading; 
				}
			}
		});

		return {
			isValid: true,
			start_line,
			end_line,
			isMultiline: false,
			block,
			nearestBeforeStartLevel,
			minLevelInRange: head_block ? head_block.level : Infinity,
			hasHeadingAtStart: !!block,
			hasHeadingAtEnd: false,
			headingAtStart: head_block || null,
			headingAtEnd: null,
			isStartHeadingMinLevel: block ? true : false,
			isEndLineJustBeforeHeading: false,
			blockContent,
			nearestHeadingTitle,
			selectedText,
			blockText
		};
	}

	let nearestBeforeStartLevel = 0;
	let minLevelInRange = Infinity;
	let hasHeadingAtStart = false;
	let hasHeadingAtEnd = false;

	let headingAtStart: HeadingCache | null = null;
	let headingAtEnd: HeadingCache | null = null;
	let isStartHeadingMinLevel = false;

	let isEndLineJustBeforeHeading = false;

	let inner_levels = new Array<number>();


	fileCache.headings?.forEach((heading) => {
		const { start, end } = heading.position;
		// 对于 start.line 在 (0, start_line) 开区间的处理
		if (start.line < start_line) {
			const distance = start_line - start.line;
			if (start_line - start.line < closestBeforeStartDistance) {
				closestBeforeStartDistance = distance;
				nearestBeforeStartLevel = heading.level;
				// 跳过以 ^ 或 ˅ 开头的标题 | 这里存疑,有可能存在 多行 block 套 block ;
				if (heading.heading.startsWith('^') || heading.heading.startsWith('˅')) {
					return;
				}
				nearestHeadingTitle = heading.heading;  // 记录最近的标题内容
			}
		}
		// 对于 start.line 在 [start_line, end_line] 全闭区间的处理
		if (start.line >= start_line && end.line <= end_line) {
			minLevelInRange = Math.min(minLevelInRange, heading.level);
			inner_levels.push(heading.level);
		}
		// 检查是否有 heading 的 start.line 正好是 start_line 或 end_line
		if (start.line === start_line) {
			hasHeadingAtStart = true;
			headingAtStart = heading;
		}
		if (start.line === end_line) {
			hasHeadingAtEnd = true;
			headingAtEnd = heading;
		}
		// 检查 end_line 是否恰好在一个 heading 的上一行
		if (start.line === end_line + 1 || start.line === end_line + 2) {
			isEndLineJustBeforeHeading = true;
		}
	});

	// 检查在 hasHeadingAtStart 为 true 时，其 level 是否是范围内最小的，并且这个值的 heading 是否唯一
	if (hasHeadingAtStart && headingAtStart != null) {
		// @ts-ignore | ts 类型识别错误了
		if (headingAtStart.level === minLevelInRange) {
			const minLevel = Math.min(...inner_levels);
			const countOfMinLevel = inner_levels.filter(
				(level) => level === minLevel
			).length;
			// headingAtStart.level is the min level in the range
			// and it is the only heading in the range
			if (
				headingAtStart &&
				// @ts-ignore
				headingAtStart.level === minLevel &&
				countOfMinLevel === 1
			) {
				isStartHeadingMinLevel = true;
			}
		}
	}
	let block = (fileCache.sections || []).find((section) => {
		return (
			section.position.start.line <= end_line &&
			section.position.end.line >= end_line
		);
	})!;

	const blockContent = block ?
		processMultiLineContent(editor, start_line, end_line, MAX_ALIAS_LENGTH) :
		null;

	return {
		isValid: true,
		start_line,
		end_line,
		isMultiline: true,
		block: block,
		nearestBeforeStartLevel,
		minLevelInRange,
		hasHeadingAtStart,
		hasHeadingAtEnd,
		headingAtStart,
		headingAtEnd,
		isStartHeadingMinLevel,
		isEndLineJustBeforeHeading,
		blockContent,
		nearestHeadingTitle,
		selectedText,
		blockText
	};
}

/**
 * Determines whether the given `head_analysis` is a heading.
 *
 * @param head_analysis - The analysis result of a heading.
 * @returns `true` if the `head_analysis` is a heading, `false` otherwise.
 */
function get_is_heading(head_analysis: HeadingAnalysisResult): boolean {
	// invalid input
	if (!head_analysis.isValid) {
		return false;
	}
	// console.log("head_analysis", head_analysis); // debug

	if (!head_analysis.isMultiline) {
		// single line
		if (
			head_analysis.hasHeadingAtStart &&
			head_analysis.headingAtStart != null
		)
			return true;
	} else {
		// multi line
		if (
			head_analysis.hasHeadingAtStart && // start_line is a heading
			head_analysis.isStartHeadingMinLevel // start_line's heading level is the min and only level in the range
		)
			return true;
	}
	return false;
}

/**
 * Generates and inserts a block link for a single line block.
 * If the block already has an ID, returns the existing ID.
 * Otherwise, generates a random ID and inserts it at the end of the block.
 * @param block - The section cache representing the block.
 * @param editor - The editor instance.
 * @returns The ID of the block link.
 */
function gen_insert_blocklink_singleline(
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
function gen_insert_blocklink_multline_heading(
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


function _gen_insert_block_singleline(
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
function gen_insert_blocklink_multline_block(
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

/**
 * Creates a BlockLinkPlusViewPlugin with the specified rule.
 *
 * @param rule - The regular expression rule used to match the block links.
 * @returns The created BlockLinkPlusViewPlugin.
 */
function createViewPlugin(
	rule: string = "(^| )˅[a-zA-Z0-9_]+$"
): BlockLinkPlusViewPlugin {
	let decorator = new MatchDecorator({
		regexp: new RegExp(rule, "g"),
		decoration: (match) => {
			// Check if this is a time section heading
			if (match[0].match(/^#{1,6}\s+\d{1,2}:\d{1,2}$/)) {
				return Decoration.mark({ class: "time-section-plain" });
			}
			// Default decoration for block IDs
			return Decoration.mark({ class: "small-font" });
		}
	});
	return ViewPlugin.define(
		(view) => ({
			decorations: decorator.createDeco(view),
			update(u) {
				this.decorations = decorator.updateDeco(u, this.decorations);
			},
		}),
		{
			decorations: (v) => v.decorations,
		}
	);
}

// all plugin need extends Plugin
export default class BlockLinkPlus extends Plugin {
	appName = this.manifest.name;
	settings: PluginSettings;
	viewPlugin: BlockLinkPlusViewPlugin;
	editorExtensions: Extension[] = [];

	async onload() {
		console.log(`loading ${this.appName}`);

		// Load settings.
		await this.loadSettings();
		// Create settings tab.
		this.addSettingTab(new BlockLinkPlusSettingsTab(this.app, this));

		// Add custom CSS
		this.addCustomStyles();

		// Register right click menu
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				this.handleEditorMenu.bind(this)
			)
		);

		this.addCommand({
			id: "copy-link-to-block",
			name: "Copy Block Link",
			editorCheckCallback: (isChecking, editor, view) => {
				return this.handleCommand(isChecking, editor, view, false);
			},
		});

		this.addCommand({
			id: "copy-embed-to-block",
			name: "Copy Block as Embed",
			editorCheckCallback: (isChecking, editor, view) => {
				return this.handleCommand(isChecking, editor, view, true);
			},
		});

		this.addCommand({
			id: "copy-url-to-block",
			name: "Copy Block as Obsidian URI",
			editorCheckCallback: (isChecking, editor, view) => {
				return this.handleCommand(isChecking, editor, view, false, true);
			},
		});

		// Insert time section
		this.addCommand({
			id: "insert-time-section",
			name: "Insert Time Section",
			editorCheckCallback: this.handleTimeCommand.bind(this)
		});

		// for reading mode
		this.registerMarkdownPostProcessor(this.markdownPostProcessor.bind(this));
		
		// for live preview
		this.updateViewPlugin();
		
		// this.refreshExtensions();
	}

	/**
	 * Updates the view plugin with the current settings.
	 * This should be called whenever settings that affect the display are changed.
	 */
	public updateViewPlugin() {
		// Create regex for both block IDs and time sections if enabled
		let rule = "(^| )˅[a-zA-Z0-9_]+$";
		
		if (this.settings.time_section_plain_style) {
			// Add time section pattern to the regex
			rule = `(${rule})|(^#{1,6}\\s+\\d{1,2}:\\d{1,2}$)`;
		}
		
		this.viewPlugin = createViewPlugin(rule);
		this.registerEditorExtension([this.viewPlugin]);
	}
	
	/**
	 * Processes markdown elements for rendering.
	 * Handles special markers and applies custom styling.
	 * @param el The HTML element to process
	 */
	private markdownPostProcessor(el: HTMLElement) {
		if (!el.firstChild) return;
		
		// Process text nodes to handle special markers
		if (el.firstChild instanceof Node) {
			let walker = document.createTreeWalker(
				el.firstChild,
				NodeFilter.SHOW_TEXT,
				null
			);
			let nodes: Node[] = [];
			let node: Node;
			// @ts-ignore
			while ((node = walker.nextNode())) {
				nodes.push(node);
			}

			for (node of nodes) {
				// @ts-ignore
				node.textContent = node.textContent.replace(
					/\s*˅[a-zA-Z0-9-]*/g,
					""
				);
			}
		}
		
		// Process time section headings if enabled
		if (this.settings.time_section_plain_style) {
			const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
			headings.forEach(heading => {
				if (heading.textContent && isTimeSection(heading.textContent.trim())) {
					// Add a special class to style time sections as plain text
					heading.classList.add('time-section-plain');
				}
			});
		}
	}
	
	// Creates new LinkifyViewPlugins and registers them.
	// refreshExtensions() {
	// 	this.viewPlugin = createViewPlugin();
	// 	this.app.workspace.updateOptions();
	// }
	
	private handleEditorMenu(
		menu: Menu,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo
	) {
		const file: TFile | null = view.file;
		if (!file) return;

		const start_line = editor.getCursor("from").line;
		const end_line = editor.getCursor("to").line;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return;

		let head_analysis = analyzeHeadings(fileCache, editor, start_line, end_line);

		// debug
		// console.log("head_analysis", head_analysis.blockContent);
		// console.log("head_analysis", head_analysis.nearestHeadingTitle);
		// console.log("head_analysis", head_analysis.nearestBeforeStartLevel);

		if (!head_analysis.isValid) return;

		let isHeading = get_is_heading(head_analysis);

		// inner function
		const addItemToMenu = (title: string, isEmbed: boolean, isUrl: boolean = false) => {
			menu.addItem((item: any) => {
				item.setTitle(title)
					.setIcon("links-coming-in")
					.onClick(() =>
						this.handleMenuItemClick(
							view,
							isHeading,
							isEmbed,
							head_analysis,
							isUrl
						)
					);
			});
		};

		// add menu items based on settings
		if (this.settings.enable_right_click_block) {
			addItemToMenu(
				isHeading ? "Copy Heading as Link" : "Copy Block as Link",
				false
			);
		}

		if (this.settings.enable_right_click_embed) {
			addItemToMenu(
				isHeading ? "Copy Heading as Embed" : "Copy Block as Embed",
				true
			);
		}

		if (this.settings.enable_right_click_url) {
			addItemToMenu(
				isHeading ? "Copy Heading as Obsidian URI" : "Copy Block as Obsidian URI",
				false,
				true
			);
		}

		// Insert time section
		if (this.settings.enable_time_section && this.settings.enable_time_section_in_menu) {
			menu.addItem((item) => {
				item.setTitle("Insert Time Section")
					.setIcon("clock")
					.onClick(() => {
						this.handleInsertTimeSection(editor, view, head_analysis);
					});
			});
		}
	}

	private handleMenuItemClick(
		view: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		isUrl: boolean = false
	) {
		if (!view.file || !head_analysis.isValid) return;

		const { file, editor } = view;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return;

		if (!head_analysis.isMultiline) {
			this.handleSingleLine(file, isHeading, isEmbed, head_analysis, editor, isUrl);
		} else {
			this.handleMultiLine(file, isHeading, isEmbed, head_analysis, editor, fileCache, isUrl);
		}
	}

	private handleSingleLine(
		file: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any,
		isUrl: boolean = false
	) {
		let link: string | undefined;

		if (this.settings.heading_id_newline && head_analysis.block) {
			link = gen_insert_blocklink_singleline(head_analysis.block, editor, this.settings);
		} else if (isHeading && head_analysis.headingAtStart) {
			link = head_analysis.headingAtStart.heading;
		} else if (!isHeading && head_analysis.block) {
			link = gen_insert_blocklink_singleline(head_analysis.block, editor, this.settings);
		}

		if (link) {
			const alias = this.calculateAlias(link, isHeading, isEmbed, isUrl, this.settings.alias_length, head_analysis);
			this.copyToClipboard(file, link, isEmbed, alias, isUrl);
		}
	}

	private handleMultiLine(
		file: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any,
		fileCache: any,
		isUrl: boolean = false
	) {
		if (isHeading && head_analysis.headingAtStart) {
			this.copyToClipboard(
				file,
				head_analysis.headingAtStart.heading,
				isEmbed,
				undefined,
				isUrl
			);
		} else {
			this.handleMultiLineBlock(file, isEmbed, head_analysis, editor, fileCache, isUrl);
		}
	}

	private _gen_insert_blocklink_multline_heading(
		fileCache: CachedMetadata,
		editor: any,
		head_analysis: HeadingAnalysisResult
	): string {
		if (!head_analysis.block) return "";

		return gen_insert_blocklink_multline_heading(
			head_analysis.block,
			editor,
			this.settings,
			head_analysis.nearestBeforeStartLevel + 1
		);
	}

	private _gen_insert_blocklink_multline_block(
		fileCache: CachedMetadata,
		editor: any,
		head_analysis: HeadingAnalysisResult
	) {
		return gen_insert_blocklink_multline_block(
			fileCache,
			editor,
			this.settings
		);
	}

	private _gene_obsidian_url(file: TFile, blockId: string): string {
		const vault = this.app.vault.getName();
		const filePath = encodeURIComponent(file.path);
		const encodedBlockId = encodeURIComponent(`#${blockId}`);

		return `obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}`;
	}

	private handleMultiLineBlock(
		file: any,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any,
		fileCache: any,
		isUrl: boolean = false
	) {
		if (this.settings.mult_line_handle == MultLineHandle.oneline) {
			if (head_analysis.block) {
				const link = gen_insert_blocklink_singleline(
					head_analysis.block,
					editor,
					this.settings
				);
				const alias = this.calculateAlias(link, false, isEmbed, isUrl, this.settings.alias_length, head_analysis);
				this.copyToClipboard(file, link, isEmbed, alias, isUrl);
			}
			return;
		} else {
			if (head_analysis.minLevelInRange != Infinity) {
				new Notice(
					`Selection cannot contain headings`,
					1500
				);
				return;
			}
			const linkMethod =
				this.settings.mult_line_handle == MultLineHandle.heading
					? this._gen_insert_blocklink_multline_heading
					: this._gen_insert_blocklink_multline_block;
			const link = linkMethod.call(
				this,
				fileCache,
				editor,
				head_analysis
			);
			const alias = this.calculateAlias(link, false, isEmbed, isUrl, this.settings.alias_length, head_analysis);
			this.copyToClipboard(file, link, isEmbed, alias, isUrl);
			return;
		}
	}

	onunload() { 
		console.log(`unloading ${this.appName}`);
		// The register method in addCustomStyles already handles
		// removing the style element, so we don't need to do it here
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update view plugin after saving settings
		// This ensures that the plugin is updated whenever settings are changed
		this.updateViewPlugin();
	}

	private handleCommand(
		isChecking: boolean,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo,
		isEmbed: boolean,
		isUrl: boolean = false
	) {
		if (isChecking) {
			return true;
		}

		const file: TFile | null = view.file;
		if (!file) return; // no file , return

		const start_line = editor.getCursor("from").line;
		const end_line = editor.getCursor("to").line;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return; // no fileCache, return

		let head_analysis = analyzeHeadings(fileCache, editor, start_line, end_line);
		if (!head_analysis.isValid) {
			return; // invalid input
		}

		let isHeading = get_is_heading(head_analysis); // is heading?

		if (!head_analysis.isMultiline) {
			// Single line
			this.handleSingleLine(
				file,
				isHeading,
				isEmbed,
				head_analysis,
				editor,
				isUrl
			);
		} else {
			// Multi line
			this.handleMultiLine(
				file,
				isHeading,
				isEmbed,
				head_analysis,
				editor,
				fileCache,
				isUrl
			);
		}
		return true;
	}

	/**
	 * Copies links to one or more blocks to the clipboard.
	 *
	 * @param file - The file containing the blocks.
	 * @param links - An array of block links (^id) or heading links (heading without `#`).
	 * @param isEmbed - Specifies whether the links should be embedded.
	 * @param alias - An optional alias for the links.
	 * @param isUrl - Specifies whether the links should be URL links.
	 */
	copyToClipboard(
		file: TFile,
		links: string | string[],
		isEmbed: boolean,
		alias?: string | string[],
		isUrl: boolean = false
	) {
		const linksArray = typeof links === "string" ? [links] : links;
		const aliasArray = typeof alias === "string" ? [alias] : alias;

		const content = linksArray
			.map((link, index) => {
				const addNewLine = index < linksArray.length - 1 ? "\n" : "";
				if (isUrl) {
					return `${this._gene_obsidian_url(file, link)}${addNewLine}`;
				}
				return `${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
					file,
					"",
					"#" + link,
					aliasArray?.[index] ?? ""
				)}${addNewLine}`;
			})
			.join("");

		navigator.clipboard.writeText(content);

		// Show notification based on settings
		if (isUrl && this.settings.enable_url_notification) {
			new Notice("Obsidian URI copied to clipboard");
		} else if (isEmbed && this.settings.enable_embed_notification) {
			new Notice("Block embed link copied to clipboard");
		} else if (!isEmbed && !isUrl && this.settings.enable_block_notification) {
			new Notice("Block link copied to clipboard");
		}
	}

	/**
	 * Calculate alias based on settings and analysis result
	 */
	private calculateAlias(
		links: string[] | string,
		isHeading: boolean,
		isEmbed: boolean,
		isUrl: boolean,
		alias_length: number,
		head_analysis: HeadingAnalysisResult,
	): string[] | string | undefined {
		// 以下情况不需要 alias：
		// 1. 是 embed 链接
		// 2. 是 URL 链接
		// 3. settings 设置为 Default
		if (isEmbed || isUrl || Number(this.settings.alias_type) === BlockLinkAliasType.Default) {
			return undefined;
		}
		// heading 情况下 alias 只能是 heading
		if (isHeading && head_analysis.headingAtStart) {
			return head_analysis.headingAtStart.heading;
		}

		// 根据设置计算 alias
		switch (Number(this.settings.alias_type)) {
			case BlockLinkAliasType.FirstChars:
				// Return the first X chars of each line if links is an array
				return links instanceof Array
					? head_analysis.blockText?.split("\n").filter(line => line.length > 0).map(line => processLineContent(line).slice(0, alias_length))
					: head_analysis.blockContent?.slice(0, alias_length);
			case BlockLinkAliasType.Heading:
				return head_analysis.nearestHeadingTitle != null ? head_analysis.nearestHeadingTitle.slice(0, alias_length) : undefined;
			case BlockLinkAliasType.SelectedText:
				const selectedText = head_analysis.selectedText?.trim();
				if (!selectedText) {
					return undefined;
				}
				return links instanceof Array
					? selectedText.split("\n").filter(line => line.length > 0).map(line => processLineContent(line))
					: processLineContent(selectedText) || undefined;
			default:
				return undefined;
		}
	}

	/**
	 * Handle inserting time section
	 * @param editor Editor instance
	 * @param view Current view
	 * @param headAnalysis Optional existing heading analysis result
	 */
	private handleInsertTimeSection(
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo,
		headAnalysis?: HeadingAnalysisResult
	) {
		// Check if the feature is enabled
		if (!this.settings.enable_time_section) return;
		
		// Get current file
		const file: TFile | null = view.file;
		if (!file) return;
		
		// Get current formatted time
		const timeStr = formatCurrentTime(this.settings.time_section_format);
		
		// Get current cursor position
		const cursorLine = editor.getCursor().line;
		
		// Determine heading level
		let headingLevel = 1;
		let insertText = "";
		
		// Check if it is a daily note
		const isDaily = isDailyNote(file.basename, this.settings.daily_note_pattern);
		
		if (isDaily) {
			// Daily note uses fixed level
			headingLevel = this.settings.daily_note_heading_level;
		} else {
			// Use existing analysis if provided, otherwise analyze heading level at current position
			if (headAnalysis && headAnalysis.isValid) {
				// Use the heading level before the current position + 1
				// If there is no previous heading, use level 1
				headingLevel = Math.min(headAnalysis.nearestBeforeStartLevel + 1, 6);
				if (headingLevel === 0) headingLevel = 1;
			} else {
				// Analyze heading level at current position
				const fileCache = this.app.metadataCache.getFileCache(file);
				if (fileCache) {
					const newHeadAnalysis = analyzeHeadings(fileCache, editor, cursorLine, cursorLine);
					if (newHeadAnalysis.isValid) {
						// Use the heading level before the current position + 1
						// If there is no previous heading, use level 1
						headingLevel = Math.min(newHeadAnalysis.nearestBeforeStartLevel + 1, 6);
						if (headingLevel === 0) headingLevel = 1;
					}
				}
			}
		}
		
		// Prepare text to insert
		if (this.settings.insert_heading_level) {
			insertText = "#".repeat(headingLevel) + " " + timeStr + "\n";
		} else {
			insertText = timeStr + "\n";
		}
		
		// Insert text at current position
		editor.replaceRange(insertText, editor.getCursor());
		
		// Move cursor to the position after inserted text
		const newPosition = {
			line: cursorLine + 1,
			ch: 0
		};
		editor.setCursor(newPosition);
	}

	/**
	 * Handle the insert time section command
	 * @param isChecking Whether this is a checking call
	 * @param editor Editor instance
	 * @param view Current view
	 * @returns Whether the command can be executed
	 */
	private handleTimeCommand(
		isChecking: boolean,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo
	): boolean {
		if (isChecking) {
			return this.settings.enable_time_section;
		}
		
		// Similar to handleCommand but for time section
		const file: TFile | null = view.file;
		if (!file) return false;
		
		const start_line = editor.getCursor("from").line;
		const end_line = editor.getCursor("to").line;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return false;
		
		let head_analysis = analyzeHeadings(fileCache, editor, start_line, end_line);
		if (!head_analysis.isValid) {
			// Even if analysis is invalid, we can still insert time section
			this.handleInsertTimeSection(editor, view);
		} else {
			this.handleInsertTimeSection(editor, view, head_analysis);
		}
		
		return true;
	}

	/**
	 * Adds custom CSS styles to the document for plugin-specific styling
	 */
	private addCustomStyles() {
		// Add the time-section-plain style to the document
		const css = `
			.time-section-plain {
				font-size: var(--font-text-size) !important;
				font-weight: normal !important;
				color: var(--text-normal) !important;
				margin-top: 0 !important;
				margin-bottom: 0 !important;
				line-height: var(--line-height-normal) !important;
				/* Remove any special heading styling */
				border: none !important;
				padding: 0 !important;
			}
		`;
		
		// Create a style element and append it to the document head
		const styleEl = document.createElement('style');
		styleEl.textContent = css;
		document.head.appendChild(styleEl);
		
		// Store a reference to remove it on unload
		this.register(() => styleEl.remove());
	}
}

class BlockLinkPlusSettingsTab extends PluginSettingTab {
	plugin: BlockLinkPlus;

	constructor(app: App, plugin: BlockLinkPlus) {
		super(app, plugin);
		this.plugin = plugin;
	}

	addToggleSetting(
		settingName: KeysOfType<PluginSettings, boolean>,
		extraOnChange?: (value: boolean) => void
	) {
		return new Setting(this.containerEl).addToggle((toggle) => {
			toggle
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
					extraOnChange?.(value);
				});
		});
	}

	// 文本输入框
	addTextInputSetting(
		settingName: KeysOfType<PluginSettings, string>,
		placeholder: string
	) {
		return new Setting(this.containerEl).addText((text) =>
			text
				.setPlaceholder(placeholder)
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					if (value.length > 0) {
						// @ts-ignore
						this.plugin.settings[settingName] = value;
						await this.plugin.saveSettings();
					}
				})
		);
	}

	addDropdownSetting(
		settingName: KeysOfType<PluginSettings, string>,
		options: string[],
		display?: (option: string) => string
	) {
		return new Setting(this.containerEl).addDropdown((dropdown) => {
			const displayNames = new Set<string>();
			for (const option of options) {
				const displayName = display?.(option) ?? option;
				if (!displayNames.has(displayName)) {
					dropdown.addOption(option, displayName);
					displayNames.add(displayName);
				}
			}
			dropdown
				.setValue(this.plugin.settings[settingName])
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	addSliderSetting(
		settingName: KeysOfType<PluginSettings, number>,
		min: number,
		max: number,
		step: number
	) {
		return new Setting(this.containerEl).addSlider((slider) => {
			slider
				.setLimits(min, max, step)
				.setValue(this.plugin.settings[settingName])
				.setDynamicTooltip()
				.onChange(async (value) => {
					// @ts-ignore
					this.plugin.settings[settingName] = value;
					await this.plugin.saveSettings();
				});
		});
	}

	addHeading(heading: string) {
		return new Setting(this.containerEl).setName(heading).setHeading();
	}

	display(): void {
		const { containerEl } = this;
		// title
		containerEl.empty();
		containerEl.createEl("h2", { text: "Block link Plus" });

		this.addDropdownSetting(
			//@ts-ignore
			"mult_line_handle",
			["0", "1", "2"],
			(option) => {
				const optionsSet = new Map([
					["0", "Default"],
					["1", "Add new heading"],
					["2", "Add multi block"],
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName("Multi-line block behavior")
			.setDesc(
				"Define how multi-line selections generate block ids. 'Default' treats them as a single line."
			);

		// Block link	
		this.addHeading("Block link").setDesc("Link: [[file#block_id]]");
		this.addToggleSetting("enable_right_click_block").setName("Enable block link in right click menu");
		this.addToggleSetting("enable_block_notification").setName("Show notification when block link is copied");

		this.addDropdownSetting(
			//@ts-ignore
			"alias_type",
			["0", "1", "2", "3"],
			(option) => {
				const optionsSet = new Map([
					["0", "No alias"],
					["1", "First X chars"],
					["2", "Parent heading"],
					["3", "Selected text"]
				]);
				return optionsSet.get(option) || "Unknown";
			}
		)
			.setName("Alias style")
			.setDesc(
				"Choose how to generate aliases for block links." +
				"For heading blocks, alias will always be the heading text unless 'No alias' is selected."
			);

		this.addSliderSetting("alias_length", 1, 100, 1)
			.setName("Alias length")
			.setDesc("Set the length of the alias (1-100). Only used when alias style is 'First X chars'.");

		this.addToggleSetting("heading_id_newline")
			.setName("Experimental: Heading block ID style")
			.setDesc("Place block ID in new line when selecting a single heading line only");

		// Embed link
		this.addHeading("Embed link").setDesc("Link: ![[file#block_id]]");
		this.addToggleSetting("enable_right_click_embed").setName("Enable embed link in right click menu");
		this.addToggleSetting("enable_embed_notification").setName("Show notification when embed link is copied");

		// Obsidian URI
		this.addHeading("Obsidian URI link").setDesc("Link: obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId} ");
		this.addToggleSetting("enable_right_click_url").setName("Enable Obsidian URI link in right click menu");
		this.addToggleSetting("enable_url_notification").setName("Show notification when URI link is copied");

		// block id
		this.addHeading("Block Id").setDesc("Custom block_id");
		this.addSliderSetting("id_length", 3, 7, 1)
			.setName("Max block id Length")
			.setDesc("Set the maximum number of characters for a block id.");

		this.addToggleSetting("enble_prefix").setName("Custom id prefix");

		this.addTextInputSetting("id_prefix", "")
			.setName("Block id prefix")
			.setDesc("Block id will be: prefix-random_str");

		// 时间章节设置
		this.addHeading("Time Section").setDesc("Insert time-based headings");
		
		this.addToggleSetting("enable_time_section")
			.setName("Enable time section feature");
		
		this.addToggleSetting("enable_time_section_in_menu")
			.setName("Show in context menu")
			.setDesc("If enabled, adds time section option to the right-click menu");
		
		this.addTextInputSetting("time_section_format", "HH:mm")
			.setName("Time format")
			.setDesc("Format for the time section (HH:mm = 24-hour format)");
		
		this.addToggleSetting("insert_heading_level")
			.setName("Insert as heading")
			.setDesc("If enabled, inserts time with heading marks (#), otherwise inserts just the time");

		this.addToggleSetting("time_section_plain_style", (value) => {
			// Update view plugin when setting changes
			this.plugin.updateViewPlugin();
		})
			.setName("Plain text style in preview")
			.setDesc("If enabled, time sections will appear as plain text in preview mode, even when inserted as headings");

		this.addTextInputSetting("daily_note_pattern", "\\d{4}-\\d{1,2}-\\d{1,2}")
			.setName("Daily note pattern")
			.setDesc("Regular expression to identify daily note filenames (default: YYYY-MM-DD)");
		
		this.addSliderSetting("daily_note_heading_level", 1, 6, 1)
			.setName("Daily note heading level")
			.setDesc("Heading level to use in daily notes (1-6, corresponds to #-######)");
	}
}
