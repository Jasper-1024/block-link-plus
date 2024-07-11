import {
	App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, HeadingCache,
	ListItemCache,
	SectionCache,
	EditorPosition,
	MarkdownFileInfo,
	Menu,
} from 'obsidian';

import { Extension } from "@codemirror/state";
import { tinyLinkPlugin } from "./cm6";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

function generateId(): string {
	return Math.random().toString(36).substr(2, 6);
}

// Function to sanitize the heading by replacing illegal characters
const illegalHeadingCharsRegex = /[!"#$%&()*+,.:;<=>?@^`{|}~\/\[\]\\]/g;
function sanitizeHeading(heading: string) {
	return heading
		.replace(illegalHeadingCharsRegex, " ")
		.replace(/\s+/g, " ")
		.trim();
}

// Function to determine if the block should be inserted after
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

// reading mode make ˅id to ""
function markdownPostProcessor(el: HTMLElement) {
	if (el.firstChild instanceof Node) {
		let walker = document.createTreeWalker(el.firstChild, NodeFilter.SHOW_TEXT, null);
		let currentNode: Node | null = walker.currentNode;

		while (currentNode) {
			const originalText = currentNode.textContent; // 直接处理每个节点
			let cleanedText = originalText ? originalText.replace(/\s*˅[a-zA-Z0-9-]*/g, "") : "";
			if (originalText !== cleanedText) {
				currentNode.textContent = cleanedText;
			}
			currentNode = walker.nextNode(); // 移动到下一个节点
		}
	}
}

// all plugin need extends Plugin
export default class HelloWorldPlugin extends Plugin {
	appName = this.manifest.name;
	settings: MyPluginSettings;
	editorExtensions: Extension[] = [];

	async onload() {
		console.log(`loading ${this.appName}`);

		// when open editor, add menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", this.handleEditorMenu.bind(this))
		);

		// Register global command 
		this.addCommand({
			id: "copy-link-to-block",
			name: "Copy link to current block or heading",
			editorCheckCallback: (isChecking, editor, view) => this.handleCommand(isChecking, editor, view, false),
		});
		this.addCommand({
			id: "copy-embed-to-block",
			name: "Copy embed to current block or heading",
			editorCheckCallback: (isChecking, editor, view) => this.handleCommand(isChecking, editor, view, true),
		});

		// for reading mode
		this.registerMarkdownPostProcessor(markdownPostProcessor);
		// 
		this.registerEditorExtension([tinyLinkPlugin]);
	}

	private handleEditorMenu(menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) {
		const file: TFile | null = view.file;
		if (!file) return; // no file , return

		// 
		const block: HeadingCache | SectionCache | ListItemCache | null = this.getBlock(editor, file);
		if (!block) return; // no block, return

		const isHeading: boolean = 'heading' in block; // is heading?

		// inner function
		const addItemToMenu = (title: string, isEmbed: boolean) => {
			menu.addItem((item: any) => {
				item.setTitle(title)
					.setIcon("links-coming-in")
					.onClick(() => this.handleItemClick(view, block, isEmbed));
			});
		};

		// add menu item
		addItemToMenu(isHeading ? "Copy link to heading" : "Copy link to block", false);
		addItemToMenu(isHeading ? "Copy heading embed" : "Copy block embed", true);
	}

	private handleItemClick(view: any, block: HeadingCache | SectionCache | ListItemCache, isEmbed: boolean): void {
		if (view.file) {
			if ('heading' in block) {
				this.handleHeading(view.file, block as HeadingCache, isEmbed);
			} else {
				this.handleBlock(view.file, view.editor, block as SectionCache | ListItemCache, isEmbed);
			}
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
		const fileCache = this.app.metadataCache.getFileCache(file);

		console.log("fileCache", fileCache); // debug

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
		} else if (block?.type === "heading") { // 如果是 heading
			// 查找 heading
			block = (fileCache?.headings || []).find((heading) => {
				return heading.position.start.line === block.position.start.line;
			}) as HeadingCache;
		}

		return block;
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
				`${isEmbed ? "!" : ""}${this.app.fileManager.generateMarkdownLink(
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


		let selectedText = editor.getSelection().trim() // get selected text

		const sectionEnd = block.position.end;
		const end: EditorPosition = {
			ch: sectionEnd.col,
			line: sectionEnd.line,
		};

		const id = generateId(); // 生成 id
		const spacer = shouldInsertAfter(block) ? "\n\n" : " "; // 插入位置

		editor.replaceRange(`${spacer}^${id}`, end); // insert block id at end of block

		const cursor = editor.getCursor("from"); // getCursor 可以获取上下界
		// for headlink
		if (sectionEnd.line != cursor.line) {
			const lineLength = editor.getLine(cursor.line).length;
			editor.setCursor(cursor.line, cursor.ch);
			editor.replaceRange(` ˅${id}`, { line: cursor.line, ch: lineLength });
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

// function analyzeHeadings(fileCache: { headings?: HeadingCache[]; } | null, start_line: number, end_line: number) {
// 	let nearestBeforeStartLevel = 0; // 距离 start_line 最近的 heading 的 level，如果不存在则为 0
// 	let minLevelInRange = 999; // [start_line, end_line] 范围内的最小 heading level，如果不存在则为 999
// 	let hasHeadingAtStart = false; // 是否有 heading 的 start.line 正好是 start_line
// 	let hasHeadingAtEnd = false; // 是否有 heading 的 start.line 正好是 end_line

// 	let headingAtStart: HeadingCache | null = null; // 在 start_line 处的 heading | 仅在 hasHeadingAtStart 为 true 时有效
// 	let headingAtEnd: HeadingCache | null = null; // 在 end_line 处的 heading | 仅在 hasHeadingAtEnd 为 true 时有效
// 	let isStartHeadingMinLevel = false; // headingAtStart 是否是最小 level 的 heading | 仅在 hasHeadingAtStart 为 true 时有效
// 	let minLevelCount = 0; // 用于检查最小 level 的 heading 是否唯一 | 仅在 hasHeadingAtStart 为 true 时有效

// 	let isEndLineJustBeforeHeading = false; //  end_line 是否正好是某个 heading 的 start.line - 1

// 	// 如果 headings 不存在或为空，则直接返回结果
// 	if (fileCache == null || !fileCache.headings || fileCache.headings.length === 0) {
// 		return { nearestBeforeStartLevel, minLevelInRange, hasHeadingAtStart, hasHeadingAtEnd };
// 	}

// 	let closestBeforeStartDistance = Infinity; // 距离 start_line 最近的距离

// 	fileCache.headings.forEach(heading => {
// 		const { start, end } = heading.position;
// 		// 对于 start.line 在 (0, start_line) 开区间的处理
// 		if (start.line < start_line) {
// 			const distance = start_line - start.line;
// 			if (distance < closestBeforeStartDistance) {
// 				closestBeforeStartDistance = distance;
// 				nearestBeforeStartLevel = heading.level;
// 			}
// 		}
// 		// 对于 start.line 在 [start_line, end_line] 全闭区间的处理
// 		if (start.line >= start_line && end.line <= end_line) {
// 			minLevelInRange = Math.min(minLevelInRange, heading.level);
// 			minLevelCount += 1; // 更新计数器
// 		}
// 		// 检查是否有 heading 的 start.line 正好是 start_line 或 end_line
// 		if (start.line === start_line) {
// 			hasHeadingAtStart = true;
// 			headingAtStart = heading;
// 		}
// 		if (start.line === end_line) {
// 			hasHeadingAtEnd = true;
// 			headingAtEnd = heading;
// 		}
// 		if (start.line === end_line + 1) { // 检查 end_line 是否恰好在一个 heading 的上一行
// 			isEndLineJustBeforeHeading = true;
// 		}
// 	});

// 	// 检查在 hasHeadingAtStart 为 true 时，其 level 是否是范围内最小的，并且这个值的 heading 是否唯一
// 	if (hasHeadingAtStart && headingAtStart != null) {
// 		// @ts-ignore | ts 类型识别错误了
// 		if (headingAtStart.level === minLevelInRange && minLevelCount === 1) {
// 			isStartHeadingMinLevel = true;
// 		}
// 	}
// 	return { nearestBeforeStartLevel, minLevelInRange, hasHeadingAtStart, hasHeadingAtEnd, headingAtStart, headingAtEnd, isStartHeadingMinLevel, isEndLineJustBeforeHeading };
// }
