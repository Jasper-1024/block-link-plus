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

export const enum MultLineHandle {
	oneline, // as one line handle
	heading, // add new heading, if select text contain not heading
	multblock, // add new block, if select text contain not block
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
	enble_prefix: boolean;
	id_prefix: string;
	id_length: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
	mult_line_handle: MultLineHandle.oneline, // as one line handle
	enble_prefix: false, // no prefix
	id_prefix: "", // prefix
	id_length: 4, // id length
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

	const sectionEnd = block.position.end;
	const end: EditorPosition = {
		ch: sectionEnd.col,
		line: sectionEnd.line,
	};

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
		if (section.position.start.line > end_line) break;
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

	return links;
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
}

function ensureStyleOnce(id: string, css: string) {
    if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.type = 'text/css';
        style.innerText = css;
        document.head.appendChild(style);
    }
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

	ensureStyleOnce(
		"unique-style-id",
		`
        .small_id {
            font-size: 1.5rem;
            opacity: 0.8;
            vertical-align: top;
            font-weight: normal;
        }
    `
	);

	let decorator = new MatchDecorator({
		regexp: new RegExp(rule, "g"),
		decoration: Decoration.mark({ class: "small_id" }),
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

		// Register right click menu
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				this.handleEditorMenu.bind(this)
			)
		);

		this.addCommand({
			id: "copy-link-to-block2",
			name: "Copy link to current block or heading",
			editorCheckCallback: (isChecking, editor, view) => {
				return this.handleCommand(isChecking, editor, view, false);
			},
		});

		this.addCommand({
			id: "copy-embed-to-block2",
			name: "Copy embed to current block or heading",
			editorCheckCallback: (isChecking, editor, view) => {
				return this.handleCommand(isChecking, editor, view, true);
			},
		});

		// for reading mode
		this.registerMarkdownPostProcessor(markdownPostProcessor);
		// for live preview
		this.viewPlugin = createViewPlugin();
		this.registerEditorExtension([this.viewPlugin]);
		// this.refreshExtensions();
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
		if (!file) return; // no file , return

		const start_line = editor.getCursor("from").line;
		const end_line = editor.getCursor("to").line;
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return; // no fileCache, return

		let head_analysis = analyzeHeadings(fileCache, start_line, end_line);
		// console.log("head_analysis", head_analysis); // debug

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
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) return; // no fileCache, return

		// console.log("handleMenuItemClick", fileCache);

		if (!head_analysis.isMultiline) {
			// Single line
			this.handleSingleLine(
				file,
				isHeading,
				isEmbed,
				head_analysis,
				editor
			);
		} else {
			// Multi line
			this.handleMultiLine(
				file,
				isHeading,
				isEmbed,
				head_analysis,
				editor,
				fileCache
			);
		}
	}

	private handleSingleLine(
		file: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any
	) {
		if (isHeading && head_analysis.headingAtStart) {
			// start_line is a heading
			this.copyToClipboard(
				file,
				head_analysis.headingAtStart.heading,
				isEmbed
			);
		} else if (!isHeading && head_analysis.block) {
			// start_line is not a heading
			const link = gen_insert_blocklink_singleline(
				head_analysis.block,
				editor,
				this.settings
			);
			this.copyToClipboard(file, link, isEmbed);
		}
	}

	private handleMultiLine(
		file: any,
		isHeading: boolean,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any,
		fileCache: any
	) {
		if (isHeading && head_analysis.headingAtStart) {
			// start_line is a heading
			this.copyToClipboard(
				file,
				head_analysis.headingAtStart.heading,
				isEmbed
			);
		} else {
			this.handleMultiLineBlock(
				file,
				isEmbed,
				head_analysis,
				editor,
				fileCache
			);
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

	private handleMultiLineBlock(
		file: any,
		isEmbed: boolean,
		head_analysis: HeadingAnalysisResult,
		editor: any,
		fileCache: any
	) {
		if (this.settings.mult_line_handle == MultLineHandle.oneline) {
			if (head_analysis.block) {
				const link = gen_insert_blocklink_singleline(
					head_analysis.block,
					editor,
					this.settings
				);
				this.copyToClipboard(file, link, isEmbed);
			}
			return;
		} else {
			if (head_analysis.minLevelInRange != Infinity) {
				new Notice(
					`Please select text that does not include headings`,
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
			this.copyToClipboard(file, link, isEmbed);
			return;
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

	private handleCommand(
		isChecking: boolean,
		editor: Editor,
		view: MarkdownView | MarkdownFileInfo,
		isEmbed: boolean
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

		let head_analysis = analyzeHeadings(fileCache, start_line, end_line);
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
				editor
			);
		} else {
			// Multi line
			this.handleMultiLine(
				file,
				isHeading,
				isEmbed,
				head_analysis,
				editor,
				fileCache
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
	 */
	copyToClipboard(
		file: TFile,
		links: string | string[],
		isEmbed: boolean,
		alias?: string
	) {
		// Convert single link to array if necessary
		const linksArray = typeof links === "string" ? [links] : links;

		const markdownLinks = linksArray
			.map((link, index) => {
				const addNewLine = index < links.length - 1 ? "\n" : "";
				return `${
					isEmbed ? "!" : ""
				}${this.app.fileManager.generateMarkdownLink(
					file,
					"",
					"#" + link,
					alias
				)}${addNewLine}`;
			})
			.join("");

		navigator.clipboard.writeText(markdownLinks);
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
		containerEl.createEl("h2", { text: "Block-link Settings" });

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
			.setName("Multi-line Block Behavior")
			.setDesc(
				"Define how multi-line selections generate block IDs. 'Default' treats them as a single line."
			);

		this.addHeading("Block ID settings");
		this.addSliderSetting("id_length", 3, 7, 1)
			.setName("Max Block ID Length")
			.setDesc("Set the maximum number of characters for a block ID.");

		this.addToggleSetting("enble_prefix").setName("Custom ID Prefix");

		this.addTextInputSetting("id_prefix", "")
			.setName("Block ID Prefix")
			.setDesc("Block ID will be: prefix-random_str");
	}
}
