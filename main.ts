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
import {
	PluginSettings,
	DEFAULT_SETTINGS,
	MultLineHandle,
	BlockLinkAliasType,
	HeadingAnalysisResult,
	KeysOfType,
	BlockLinkPlusViewPlugin
} from './src/types';
import {
	generateRandomId,
	shouldInsertAfter,
	formatCurrentTime,
	isTimeSection,
	isDailyNote,
	processLineContent,
	processMultiLineContent,
	get_is_heading
} from './src/utils';
// import { RangeSet } from "@codemirror/state";

// Inline Edit`
import { getActiveCM } from "basics/codemirror";
import { FlowEditorManager } from "./src/features/flow-editor";
import { ObsidianEnactor } from "basics/enactor/obsidian";
import { loadFlowCommands } from "basics/flow/flowCommands";
import { replaceAllEmbed, replaceAllTables } from "basics/flow/markdownPost";
import {
	patchWorkspaceForFlow,
	patchWorkspaceLeafForFlow,
} from "basics/flow/patchWorkspaceForFlow";
import { flowEditorInfo, toggleFlowEditor } from "basics/codemirror/flowEditor";
import { Enactor } from "basics/enactor/enactor";
import { Command } from "basics/types/command";

import i18n from "shared/i18n";
import t from "shared/i18n";
import { DropdownComponent} from "obsidian";

// 导入所需的 CSS
import "css/DefaultVibe.css";
import "css/Editor/Flow/FlowEditor.css";
import "css/Editor/Flow/FlowState.css";
import "css/Obsidian/Mods.css";
import "./src/css/custom-styles.css";

import { BlockLinkPlusSettingsTab } from './src/ui/SettingsTab';
import { createViewPlugin } from './src/ui/ViewPlugin';
import { markdownPostProcessor } from './src/ui/MarkdownPost';
import * as TimeSection from './src/features/time-section';
import * as LinkCreation from './src/features/link-creation';
import { analyzeHeadings } from "./src/features/heading-analysis";
import * as Clipboard from './src/features/clipboard-handler';
import * as CommandHandler from './src/features/command-handler';
import * as EditorMenu from './src/ui/EditorMenu';

const MAX_ALIAS_LENGTH = 100;

// all plugin need extends Plugin
export default class BlockLinkPlus extends Plugin {
	appName = this.manifest.name;
	settings: PluginSettings;
	viewPlugin: BlockLinkPlusViewPlugin;
	editorExtensions: Extension[] = [];
	flowEditorManager: FlowEditorManager;

	public get enactor(): Enactor {
		return this.flowEditorManager.enactor;
	}

	// Public API for external plugin integration
	public api = {
		// Flow editor controls
		openFlowEditor: () => this.flowEditorManager.openFlow(),
		closeFlowEditor: () => this.flowEditorManager.closeFlow(),

		// Settings access
		getSettings: () => this.settings,
		updateSettings: async (newSettings: Partial<PluginSettings>) => {
			this.settings = { ...this.settings, ...newSettings };
			await this.saveSettings();
		},

		// Editor utilities
		getActiveEditor: () => getActiveCM(this),

		// Check if flow editing is enabled
		isFlowEnabled: () => this.settings.editorFlow,

		// Access to enactor for path operations
		getEnactor: () => this.flowEditorManager.enactor
	};

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
				(menu, editor, view) => EditorMenu.handleEditorMenu(this, menu, editor, view)
			)
		);

		this.addCommand({
			id: "copy-link-to-block",
			name: "Copy Block Link",
			editorCheckCallback: (isChecking, editor, view) => {
				return CommandHandler.handleCommand(this, isChecking, editor, view, false);
			},
		});

		this.addCommand({
			id: "copy-embed-to-block",
			name: "Copy Block as Embed",
			editorCheckCallback: (isChecking, editor, view) => {
				return CommandHandler.handleCommand(this, isChecking, editor, view, true);
			},
		});

		this.addCommand({
			id: "copy-url-to-block",
			name: "Copy Block as Obsidian URI",
			editorCheckCallback: (isChecking, editor, view) => {
				return CommandHandler.handleCommand(this, isChecking, editor, view, false, true);
			},
		});

		// Insert time section
		this.addCommand({
			id: "insert-time-section",
			name: "Insert Time Section",
			editorCheckCallback: (isChecking, editor, view) =>
				TimeSection.handleTimeCommand(this, isChecking, editor, view)
		});

		// for reading mode
		this.registerMarkdownPostProcessor((el) => markdownPostProcessor(el, this));

		// for live preview
		this.updateViewPlugin();

		// Initialize Flow Editor Manager
		this.flowEditorManager = new FlowEditorManager(this);
		this.flowEditorManager.initialize();

		// Register plugin in global scope for external access
		(window as any).BlockLinkPlus = this;

		if (this.app.plugins) {
			(this.app.plugins as any).plugins['blocoklnnk-plu-plus'] = this;
		}
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
						TimeSection.handleInsertTimeSection(this, editor, view, head_analysis);
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
			link = LinkCreation.gen_insert_blocklink_singleline(head_analysis.block, editor, this.settings);
		} else if (isHeading && head_analysis.headingAtStart) {
			link = head_analysis.headingAtStart.heading;
		} else if (!isHeading && head_analysis.block) {
			link = LinkCreation.gen_insert_blocklink_singleline(head_analysis.block, editor, this.settings);
		}

		if (link) {
			const alias = Clipboard.calculateAlias(this.settings, link, isHeading, isEmbed, isUrl, this.settings.alias_length, head_analysis);
			Clipboard.copyToClipboard(this.app, this.settings, file, link, isEmbed, alias, isUrl);
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
			Clipboard.copyToClipboard(this.app, this.settings, file, head_analysis.headingAtStart.heading, isEmbed, undefined, isUrl);
		} else {
			CommandHandler.handleMultiLineBlock(this, file, isEmbed, head_analysis, editor, fileCache, isUrl);
		}
	}

	private _gen_insert_blocklink_multline_heading(
		fileCache: CachedMetadata,
		editor: any,
		head_analysis: HeadingAnalysisResult
	): string {
		if (!head_analysis.block) return "";

		return LinkCreation.gen_insert_blocklink_multline_heading(
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
		return LinkCreation.gen_insert_blocklink_multline_block(
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
}