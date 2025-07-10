import {
	Plugin,
	Notice
} from "obsidian";

import { Extension } from "@codemirror/state";

import {
	PluginSettings,
	DEFAULT_SETTINGS,
	BlockLinkPlusViewPlugin
} from './types';

import { getAPI } from "obsidian-dataview";

// Inline Edit`
import { getActiveCM } from "basics/codemirror";
import { FlowEditorManager } from "./features/flow-editor";
import { Enactor } from "basics/enactor/enactor";

// 导入所需的 CSS
import "css/DefaultVibe.css";
import "css/Editor/Flow/FlowEditor.css";
import "css/Editor/Flow/FlowState.css";
import "css/Obsidian/Mods.css";
import "css/custom-styles.css";

import { BlockLinkPlusSettingsTab } from 'ui/SettingsTab';
import { createViewPlugin } from 'ui/ViewPlugin';
import { markdownPostProcessor } from 'ui/MarkdownPost';
import * as TimeSection from 'features/time-section';
import * as CommandHandler from 'features/command-handler';
import * as EditorMenu from 'ui/EditorMenu';
import { handleTimeline } from 'features/dataview-timeline';
import { detectDataviewStatus, isDataviewAvailable } from "./utils/dataview-detector";
import { DebugUtils } from "./utils/debug";

const MAX_ALIAS_LENGTH = 100;

// all plugin need extends Plugin
export default class BlockLinkPlus extends Plugin {
	settings: PluginSettings;
	appName = "Block Link Plus";
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

	/**
	 * Update the view plugin
	 */
	public updateViewPlugin() {
		// Create regex for both block IDs and time sections if enabled
		let rule = "(^| )˅[a-zA-Z0-9_]+$";
		const timePattern = this.settings.time_section_title_pattern || "\\d{1,2}:\\d{1,2}";

		if (this.settings.time_section_plain_style) {
			// Add time section pattern to the regex using the configurable pattern
			rule = `(${rule})|(^#{1,6}\\s+${timePattern}$)`;
		}

		this.viewPlugin = createViewPlugin(rule, timePattern);
		this.registerEditorExtension([this.viewPlugin]);
	}

	async onload() {
		console.log(`loading ${this.appName}`);
		// Initialize debug utilities
		DebugUtils.init(this);

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

		// Register post-processor for blp-timeline blocks
		// run when setting enableTimeline is true
		this.registerMarkdownCodeBlockProcessor('blp-timeline', (source, el, ctx) => {
			if (this.settings.enableTimeline && isDataviewAvailable()) {
				handleTimeline(this, source, el, ctx);
			} else {
				el.empty();
				if (!this.settings.enableTimeline) {
					el.createEl("pre", { text: "Timeline feature is disabled." });
				} else {
					el.createEl("pre", { text: "Timeline feature requires Dataview plugin." });
				}
			}
		});

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
}
