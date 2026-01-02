import BlockLinkPlus from "main";
import { Enactor } from "basics/enactor/enactor";
import { ObsidianEnactor } from "basics/enactor/obsidian";

export class FlowEditorManager {
	private plugin: BlockLinkPlus;
	public enactor: Enactor;

	constructor(plugin: BlockLinkPlus) {
		this.plugin = plugin;
		this.enactor = new ObsidianEnactor(this.plugin);
	}

	/**
	 * Legacy FlowEditorManager now only loads CodeMirror extensions required by BLP
	 * (e.g. selective editor ranges). Range (`^id-id`) rendering is handled by InlineEditEngine.
	 */
	public initialize(): void {
		this.enactor.load();
		this.reloadExtensions(true);
	}

	public reloadExtensions(firstLoad: boolean): void {
		(this.enactor as ObsidianEnactor).loadExtensions(firstLoad);
	}

	// Deprecated API surface (kept for compatibility).
	public openFlow(): void {}
	public closeFlow(): void {}
}
