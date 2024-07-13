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

import { Extension } from "@codemirror/state";
import { tinyLinkPlugin } from "./cm6";
import { assert } from "console";

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
};

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

/**
 * Generates a random ID.
 *
 * @returns A string representing the random ID.
 */
function generateRandomId(): string {
	return Math.random().toString(36).substring(2, 6);
}

// Function to sanitize the heading by replacing illegal characters
const illegalHeadingCharsRegex = /[!"#$%&()*+,.:;<=>?@^`{|}~\/\[\]\\]/g;
/**
 * Sanitizes a heading by replacing illegal characters and removing extra whitespace.
 *
 * @param heading - The heading to sanitize.
 * @returns The sanitized heading.
 */
function sanitizeHeading(heading: string) {
	return heading
		.replace(illegalHeadingCharsRegex, " ")
		.replace(/\s+/g, " ")
		.trim();
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
 * Analyzes the headings within a specified range of lines in a file.
 * 
 * @param fileCache - The cached metadata of the file.
 * @param start_line - The starting line of the range.
 * @param end_line - The ending line of the range.
 * @returns The analysis result of the headings within the specified range.
 */
function analyzeHeadings(
	fileCache: CachedMetadata,
	start_line: number,
	end_line: number
): HeadingAnalysisResult {
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
		};
	}

	console.log("analyzeHeadings", fileCache, start_line, end_line); // debug
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
				section.position.start.line <= start_line &&
				section.position.end.line >= start_line
			);
		})!;
		return {
			isValid: true,
			start_line,
			end_line,
			isMultiline: false,
			block,
			nearestBeforeStartLevel: 0,
			minLevelInRange: head_block ? head_block.level : Infinity,
			hasHeadingAtStart: !!block,
			hasHeadingAtEnd: false,
			headingAtStart: head_block || null,
			headingAtEnd: null,
			isStartHeadingMinLevel: block ? true : false,
			isEndLineJustBeforeHeading: false,
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

	let closestBeforeStartDistance = Infinity; // record the closest heading distance at [0, start_line)

	let inner_levels = new Array<number>();

	fileCache.headings?.forEach((heading) => {
		const { start, end } = heading.position;
		// 对于 start.line 在 (0, start_line) 开区间的处理
		if (start.line < start_line) {
			const distance = start_line - start.line;
			if (start_line - start.line < closestBeforeStartDistance) {
				closestBeforeStartDistance = distance;
				nearestBeforeStartLevel = heading.level;
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

	console.log(
		"analyzeHeadings",
		headingAtStart,
		minLevelInRange,
		inner_levels
	);

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
	return {
		isValid: true,
		start_line,
		end_line,
		isMultiline: true,
		block: null,
		nearestBeforeStartLevel,
		minLevelInRange,
		hasHeadingAtStart,
		hasHeadingAtEnd,
		headingAtStart,
		headingAtEnd,
		isStartHeadingMinLevel,
		isEndLineJustBeforeHeading,
	};
}

/**
 * Determines if the provided `head_analysis` is a heading.
 * 
 * @param head_analysis - The analysis result of a heading.
 * @returns A boolean indicating whether the `head_analysis` is a heading.
 */
function get_is_heading(head_analysis: HeadingAnalysisResult): boolean {
	// invalid input
	if (!head_analysis.isValid) {
		return false;
	}
	console.log("head_analysis", head_analysis); // debug

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
	editor: Editor
): string {
	if (block.id) {
		return block.id;
	}

	const sectionEnd = block.position.end;
	const end: EditorPosition = {
		ch: sectionEnd.col,
		line: sectionEnd.line,
	};

	const id = generateRandomId(); // gen id
	const spacer = shouldInsertAfter(block) ? "\n\n" : " "; // insert to line or next line

	editor.replaceRange(`${spacer}^${id}`, end); // insert block id at end of block
	return `^${id}`;
}

/**
 * Processes the markdown element by removing specific text patterns.
 * make ˅id to ""
 * @param el - The HTML element to process.
 */
function markdownPostProcessor(el: HTMLElement) {
	if (el.firstChild instanceof Node) {
		let walker = document.createTreeWalker(
			el.firstChild,
			NodeFilter.SHOW_TEXT,
			null
		);
		let currentNode: Node | null = walker.currentNode;

		while (currentNode) {
			const originalText = currentNode.textContent; // 直接处理每个节点
			let cleanedText = originalText
				? originalText.replace(/\s*˅[a-zA-Z0-9-]*/g, "")
				: "";
			if (originalText !== cleanedText) {
				currentNode.textContent = cleanedText;
			}
			currentNode = walker.nextNode(); // 移动到下一个节点
		}
	}
}

// all plugin need extends Plugin
export default class BlockLinkPlugin extends Plugin {
	appName = this.manifest.name;
	settings: MyPluginSettings;
	editorExtensions: Extension[] = [];

	async onload() {
		console.log(`loading ${this.appName}`);

		// Register right click menu
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				this.handleEditorMenu.bind(this)
			)
		);

		// Register global command
		// this.addCommand({
		// 	id: "copy-link-to-block",
		// 	name: "Copy link to current block or heading",
		// 	editorCheckCallback: (isChecking, editor, view) =>
		// 		this.handleCommand(isChecking, editor, view, false),
		// });
		// this.addCommand({
		// 	id: "copy-embed-to-block",
		// 	name: "Copy embed to current block or heading",
		// 	editorCheckCallback: (isChecking, editor, view) =>
		// 		this.handleCommand(isChecking, editor, view, true),
		// });

		// for reading mode
		// this.registerMarkdownPostProcessor(markdownPostProcessor);
		//
		// this.registerEditorExtension([tinyLinkPlugin]);
	}

	private handleEditorMenu(
		menu: Menu,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo
	) {
		const file: TFile | null = view.file;
		if (!file) return; // no file , return

		const start_line = editor.getCursor("from").line;
		const end_line = editor.getCursor("to").line;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return; // no fileCache, return

		let head_analysis = analyzeHeadings(fileCache, start_line, end_line);
		console.log("head_analysis", head_analysis); // debug

		if (!head_analysis.isValid) {
			return; // invalid input
		}
		let isHeading = get_is_heading(head_analysis); // is heading?

		// inner function
		const addItemToMenu = (title: string, isEmbed: boolean) => {
			menu.addItem((item: any) => {
				item.setTitle(title)
					.setIcon("links-coming-in")
					.onClick(() =>
						this.handleMenuItemClick(
							view,
							isHeading,
							isEmbed,
							head_analysis
						)
					);
			});
		};

		// add menu item
		addItemToMenu(
			isHeading ? "Copy link to heading" : "Copy link to block",
			false
		);
		addItemToMenu(
			isHeading ? "Copy heading embed" : "Copy block embed",
			true
		);
	}

	private handleMenuItemClick(
		view: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult
	) {
		if (!view.file || !head_analysis.isValid) return; // no file or invalid input

		const { file, editor } = view;

		if (!head_analysis.isMultiline) {
			// signle line
			if (isHeading && head_analysis.headingAtStart) {
				// start_line is a heading
				this.copyLinkToClipboard(
					file,
					head_analysis.headingAtStart.heading,
					isEmbed
				);
			} else if (!isHeading && head_analysis.block) {
				// start_line is not a heading
				const link = gen_insert_blocklink_singleline(
					head_analysis.block,
					editor
				);
				this.copyLinkToClipboard(file, link, isEmbed);
			}
			return;
		}
		// multi line
		if (isHeading && head_analysis.headingAtStart) {
			// start_line is a heading
			this.copyLinkToClipboard(
				file,
				head_analysis.headingAtStart.heading,
				isEmbed
			);
		}
	}

	private handleItemClick(
		view: any,
		block: HeadingCache | SectionCache | ListItemCache,
		isEmbed: boolean
	): void {
		if (view.file) {
			if ("heading" in block) {
				this.handleHeading(view.file, block as HeadingCache, isEmbed);
			} else {
				this.handleBlock(
					view.file,
					view.editor,
					block as SectionCache | ListItemCache,
					isEmbed
				);
			}
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	handleCommand(
		isChecking: boolean,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo,
		isEmbed: boolean
	) {
		if (isChecking) {
			// @ts-ignore
			return !!this.getBlock(editor, view.file);
		}

		const file = view.file;
		if (!file) return;

		const block = this.getBlock(editor, file);

		if (!block) return;

		const isHeading = !!(block as any).heading;

		if (isHeading) {
			this.handleHeading(view.file!, block as HeadingCache, isEmbed);
		} else {
			const file = view.file!;
			this.handleBlock(
				file,
				editor,
				block as SectionCache | ListItemCache,
				isEmbed
			);
		}
	}

	getBlock(editor: Editor, file: TFile) {
		const cursor = editor.getCursor("to");

		const cursor_to = editor.getCursor("to");
		const cursor_from = editor.getCursor("from");

		const fileCache = this.app.metadataCache.getFileCache(file);

		// console.log("fileCache", fileCache); // debug

		// 查找 section
		let block: ListItemCache | HeadingCache | SectionCache = (
			fileCache?.sections || []
		).find((section) => {
			// cursor.line 当前行 所在的 ListItemCache | HeadingCache | SectionCache
			return (
				section.position.start.line <= cursor.line &&
				section.position.end.line >= cursor.line
			);
		})!; // add type assertion here

		// 如果从 section 找到的是 list
		if (block?.type === "list") {
			// 查找 item
			block = (fileCache?.listItems || []).find((item) => {
				return (
					item.position.start.line <= cursor.line &&
					item.position.end.line >= cursor.line
				);
			}) as ListItemCache;
		} else if (block?.type === "heading") {
			// 如果是 heading
			// 查找 heading
			block = (fileCache?.headings || []).find((heading) => {
				return (
					heading.position.start.line === block.position.start.line
				);
			}) as HeadingCache;
		}

		return block;
	}

	/**
	 * Copies a link to a block to the clipboard.
	 *
	 * @param file - The file containing the block.
	 * @param link - block link is ^id, heading link is heading without `#`
	 * @param isEmbed - Specifies whether the link should be embedded.
	 * @param alias - An optional alias for the link.
	 */
	copyLinkToClipboard(
		file: TFile,
		link: string,
		isEmbed: boolean,
		alias?: string
	) {
		navigator.clipboard.writeText(
			`${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
				file,
				"",
				"#" + link,
				alias
			)}`
		);
	}

	// title -> link
	handleHeading(file: TFile, block: HeadingCache, isEmbed: boolean) {
		navigator.clipboard.writeText(
			`${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
				file,
				"",
				"#" + sanitizeHeading(block.heading)
			)}`
		);
	}

	handleBlock(
		file: TFile,
		editor: Editor,
		block: ListItemCache | SectionCache,
		isEmbed: boolean
	) {
		const blockId = block.id;

		// Copy existing block id
		if (blockId) {
			return navigator.clipboard.writeText(
				`${
					isEmbed ? "!" : ""
				}${this.app.fileManager.generateMarkdownLink(
					file,
					"",
					"#^" + blockId
				)}`
			);
		}

		// Add a block id
		// const sectionStart = block.position.start;
		// const start: EditorPosition = {
		// 	ch: editor.getLine(sectionStart.line).length,
		// 	line: sectionStart.line,
		// };

		let selectedText = editor.getSelection().trim(); // get selected text

		const sectionEnd = block.position.end;
		const end: EditorPosition = {
			ch: sectionEnd.col,
			line: sectionEnd.line,
		};

		const id = generateRandomId(); // 生成 id
		const spacer = shouldInsertAfter(block) ? "\n\n" : " "; // 插入位置

		editor.replaceRange(`${spacer}^${id}`, end); // insert block id at end of block

		const cursor = editor.getCursor("from"); // getCursor 可以获取上下界
		// for headlink
		if (sectionEnd.line != cursor.line) {
			const lineLength = editor.getLine(cursor.line).length;
			editor.setCursor(cursor.line, cursor.ch);
			editor.replaceRange(` ˅${id}`, {
				line: cursor.line,
				ch: lineLength,
			});
		}

		navigator.clipboard.writeText(
			`${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
				file,
				"",
				"#^" + id
			)}`
		);
	}

	// test(
	// 	file: TFile,
	// 	editor: Editor,
	// 	isEmbed: boolean
	// ) {
	// 	const cursor_start = editor.getCursor("from");
	// 	const cursor_end = editor.getCursor("to");

	// 	if (cursor_start.line > cursor_end.line) { // err
	// 		console.log("start line should be less than end line, start: ", cursor_start.line, "end: ", cursor_end.line);
	// 		return;
	// 	}

	// 	if (cursor_start.line == cursor_end.line) {
	// 		//todo: one line handle
	// 		return;
	// 	}

	// 	const fileCache = this.app.metadataCache.getFileCache(file);
	// 	console.log("fileCache", fileCache); // just for debug

	// 	const { nearestBeforeStartLevel, minLevelInRange, hasHeadingAtStart, hasHeadingAtEnd, headingAtStart, headingAtEnd, isStartHeadingMinLevel, isEndLineJustBeforeHeading } = analyzeHeadings(fileCache, cursor_start.line, cursor_end.line);
	// 	console.log("nearestBeforeStartLevel", nearestBeforeStartLevel, "minLevelInRange", minLevelInRange, "hasHeadingAtStart", hasHeadingAtStart, "hasHeadingAtEnd", hasHeadingAtEnd, "headingAtStart", headingAtStart, "headingAtEnd", headingAtEnd);

	// 	// 开始行存在 heading  且 开始行的 level 是整段文本的最小 level 且 结束行正好是某个 heading 的上一行
	// 	if (hasHeadingAtStart && isStartHeadingMinLevel && isEndLineJustBeforeHeading) {
	// 		// 选中文本恰好是一个 level 最小的 heading 的全部内容
	// 		// todo 直接拷贝 headingAtStart 的标题作为 id
	// 	}

	// 	if (minLevelInRange == 1) {
	// 		// 无法处理
	// 		return;
	// 	}

	// 	let true_level = 0;
	// 	if(minLevelInRange == 999) { // 选中文本中没有 heading
	// 		true_level = nearestBeforeStartLevel + 1; // 外部最近的 heading 的 level + 1
	// 		// 外部没有 heading 时候 nearestBeforeStartLevel = 0, 所以 true_level = 1
	// 	}

	// 	if (nearestBeforeStartLevel >= minLevelInRange) { // 选中文本中 heading 的 level 大于等于外部最近的 heading 的 level
	// 		true_level = minLevelInRange - 1;// 取最小能包裹 选中文本 的 level
	// 	}

	// 	true_level = minLevelInRange - 1;
	// }
}
