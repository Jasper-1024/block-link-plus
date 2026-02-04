import {
	Plugin
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
import { InlineEditEngine } from "./features/inline-edit-engine";
import { Enactor } from "basics/enactor/enactor";

// 导入所需的 CSS
import "css/DefaultVibe.css";
import "css/Editor/InlineEdit/InlineEditEngine.css";
import "css/Obsidian/Mods.css";
import "css/Obsidian/SettingsTabs.css";
import "css/vendor-obsidian-outliner.css";
import "css/vendor-obsidian-zoom.css";
import "css/custom-styles.css";

import { BlockLinkPlusSettingsTab } from 'ui/SettingsTab';
import { createViewPlugin } from 'ui/ViewPlugin';
import { fileOutlinerMarkdownPostProcessor } from "ui/MarkdownPostOutliner";
import { WhatsNewModal } from "ui/WhatsNewModal";
import { BLP_BLOCK_MARKER_RULE } from "shared/block-marker";
import * as CommandHandler from 'features/command-handler';
import * as EditorMenu from 'ui/EditorMenu';
import { handleBlpView, registerFileOutlinerView } from "features/file-outliner-view";
import { getFileOutlinerScopeManager } from "features/file-outliner-view/enable-scope";
import { detectDataviewStatus, isDataviewAvailable } from "./utils/dataview-detector";
import { DebugUtils } from "./utils/debug";
import { decideWhatsNewOnStartup } from "features/whats-new";
import { BuiltInVslinkoManager } from "features/built-in-vslinko";

const MAX_ALIAS_LENGTH = 100;

// all plugin need extends Plugin
export default class BlockLinkPlus extends Plugin {
	settings: PluginSettings;
	appName = "Block Link Plus";
	viewPlugin: BlockLinkPlusViewPlugin;
	editorExtensions: Extension[] = [];
	flowEditorManager: FlowEditorManager;
	inlineEditEngine: InlineEditEngine;
	private hasExistingSettingsData = false;
	private builtInVslinko: BuiltInVslinkoManager | null = null;
	private viewPluginRegistered = false;

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
		isFlowEnabled: () => this.settings.inlineEditEnabled,

		// Access to enactor for path operations
		getEnactor: () => this.flowEditorManager.enactor
	};

	public getBuiltInOutlinerSettings() {
		return this.builtInVslinko?.getOutlinerSettings() ?? null;
	}

	public getBuiltInZoomSettings() {
		return this.builtInVslinko?.getZoomSettings() ?? null;
	}

	/**
	 * Update the view plugin
	 */
	public updateViewPlugin() {
		// `registerEditorExtension` only adds; calling it repeatedly will stack duplicates.
		// This rule is currently constant, so register once per plugin load.
		if (!this.viewPlugin) {
			this.viewPlugin = createViewPlugin(BLP_BLOCK_MARKER_RULE);
		}
		if (!this.viewPluginRegistered) {
			this.registerEditorExtension([this.viewPlugin]);
			this.viewPluginRegistered = true;
		}
	}

	async onload() {
		console.log(`loading ${this.appName}, version: ${this.manifest.version}`);
		// Initialize debug utilities
		DebugUtils.init(this);

		// Load settings.
		await this.loadSettings();
		// Create settings tab.
		this.addSettingTab(new BlockLinkPlusSettingsTab(this.app, this));

		// Built-in vendored plugins (vslinko).
		this.builtInVslinko = new BuiltInVslinkoManager(this);
		await this.builtInVslinko.load();

		// File-level outliner view (v2).
		registerFileOutlinerView(this);

		await this.maybeShowWhatsNew();

		// Register right click menu
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu, editor, view) => EditorMenu.handleEditorMenu(this, menu, editor, view)
			)
		);

		// Register processor for blp-view code blocks (Query/View)
		this.registerMarkdownCodeBlockProcessor("blp-view", (source, el, ctx) => {
			if (isDataviewAvailable()) {
				void handleBlpView(this, source, el, ctx);
			} else {
				el.empty();
				el.createEl("pre", { text: "blp-view requires Dataview plugin." });
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

		// for reading mode
		this.registerMarkdownPostProcessor((el, ctx) => fileOutlinerMarkdownPostProcessor(el, ctx, this));

		// for live preview
		this.updateViewPlugin();

		// Initialize Flow Editor Manager
		this.flowEditorManager = new FlowEditorManager(this);
		this.flowEditorManager.initialize();

		// New inline edit engine scaffold (safe no-op for now)
		this.inlineEditEngine = new InlineEditEngine(this);
		this.inlineEditEngine.load();
		this.register(() => this.inlineEditEngine.unload());

		// Register plugin in global scope for external access
		(window as any).BlockLinkPlus = this;
	}

	async loadSettings() {
		const raw = (await this.loadData()) ?? {};
		this.hasExistingSettingsData =
			typeof raw === "object" && raw !== null && Object.keys(raw).length > 0;
		let shouldSave = false;

			if (typeof raw === "object" && raw !== null) {
				if ("editorFlow" in raw && !("inlineEditEnabled" in raw)) {
					raw.inlineEditEnabled = raw.editorFlow;
					shouldSave = true;
				}

			const legacyKeys = [
				"editorFlow",
				"editorFlowStyle",
				"timelineDefaultEmbedFormat",
				"enableTimeline",
				"timelineDefaultHeadingLevel",
				"timelineDefaultSortOrder",
				"enable_time_section",
				"time_section_format",
				"time_section_title_pattern",
				"daily_note_pattern",
				"insert_heading_level",
				"daily_note_heading_level",
				"enable_time_section_in_menu",
				"time_section_plain_style",
				"enable_right_click_editable_embed",
				"enable_editable_embed_notification",
			] as const;

			for (const key of legacyKeys) {
				if (key in raw) {
					delete raw[key];
					shouldSave = true;
				}
			}
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, raw);

		if (shouldSave) {
			await this.saveData(this.settings);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.inlineEditEngine?.onSettingsChanged();
		this.builtInVslinko?.onSettingsChanged(false);
		getFileOutlinerScopeManager(this).onSettingsChanged();
	}

	async onunload() {
		if (this.builtInVslinko) {
			await this.builtInVslinko.unload();
			this.builtInVslinko = null;
		}
	}

	private async maybeShowWhatsNew() {
		const currentVersion = this.manifest.version;
		const lastSeenVersion = this.settings.lastSeenVersion ?? "";

		const decision = decideWhatsNewOnStartup({
			currentVersion,
			lastSeenVersion,
			hasExistingData: this.hasExistingSettingsData,
		});

		if (decision.kind === "none") return;

		this.settings.lastSeenVersion = decision.lastSeenVersion;
		await this.saveData(this.settings);

		if (decision.kind === "record") return;

		this.app.workspace.onLayoutReady(() => {
			new WhatsNewModal(this.app, {
				currentVersion,
				previousVersion: decision.previousVersion,
			}).open();
		});
	}
}
