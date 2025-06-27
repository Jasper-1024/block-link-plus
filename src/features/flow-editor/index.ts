// This file will contain the FlowEditorManager class.
// Content will be added in the next steps. 

import BlockLinkPlus from "main";
import { Enactor } from "basics/enactor/enactor";
import { ObsidianEnactor } from "basics/enactor/obsidian";
import { MarkdownView } from "obsidian";
import {
	patchWorkspaceForFlow,
	patchWorkspaceLeafForFlow,
} from "basics/flow/patchWorkspaceForFlow";
import { replaceAllEmbed, replaceAllTables } from "basics/flow/markdownPost";
import { loadFlowCommands } from "basics/flow/flowCommands";
import { getActiveCM } from "basics/codemirror";
import { flowEditorInfo, toggleFlowEditor } from "basics/codemirror/flowEditor";

export class FlowEditorManager {
    private plugin: BlockLinkPlus;
    public enactor: Enactor;

    constructor(plugin: BlockLinkPlus) {
        this.plugin = plugin;
        this.enactor = new ObsidianEnactor(this.plugin);
    }

    public initialize() {
        this.enactor.load();

		if (this.plugin.settings.editorFlow) {
			this.setupFlowEditor();
			this.reloadExtensions(true);
		}
    }

    private setupFlowEditor(): void {
		// Patch workspace for flow editing
		patchWorkspaceForFlow(this.plugin);
		patchWorkspaceLeafForFlow(this.plugin);

		// Apply CSS classes for flow editing
		document.body.classList.add("mk-flow-replace");
		document.body.classList.add("mk-flow-" + this.plugin.settings.editorFlowStyle);

		// Register markdown post processor for embedded blocks
		this.plugin.registerMarkdownPostProcessor((element, context) => {
			const view = this.plugin.app.workspace.activeLeaf?.view;
			if (view instanceof MarkdownView) {
				if (view.getMode() === "preview") {
					return;
				}
			}

			this.processEmbeddedBlocks(element);
			replaceAllTables(this.plugin, element, context);
			replaceAllEmbed(element, context, this.plugin, this.plugin.app);
		});

		// Load flow commands
		loadFlowCommands(
			this.plugin.addCommand.bind(this.plugin),
			this.openFlow.bind(this),
			this.closeFlow.bind(this)
		);
	}

    private processEmbeddedBlocks(element: HTMLElement): void {
		const embeds = element.querySelectorAll(".internal-embed.markdown-embed");
		for (let index = 0; index < embeds.length; index++) {
			const embed = embeds.item(index) as HTMLElement;
			if (
				embed.previousSibling &&
				embed.previousSibling.textContent?.slice(-1) === "!"
			) {
				embed.previousSibling.textContent =
					embed.previousSibling.textContent.slice(0, -1);
			}
		}
	}

    public reloadExtensions(firstLoad: boolean): void {
		(this.enactor as ObsidianEnactor).loadExtensions(firstLoad);
	}

    public openFlow(): void {
		const cm = getActiveCM(this.plugin);
		if (cm) {
			const value = cm.state.field(flowEditorInfo, false);
			if (!value) return;
			const currPosition = cm.state.selection.main;
			for (const flowEditor of value) {
				if (
					flowEditor.from < currPosition.to &&
					flowEditor.to > currPosition.from
				) {
					cm.dispatch({
						annotations: toggleFlowEditor.of([flowEditor.id, 2]),
					});
				}
			}
		}
	}

	public closeFlow(): void {
		const cm = getActiveCM(this.plugin);
		if (cm) {
			const value = cm.state.field(flowEditorInfo, false);
			if (!value) return;
			const currPosition = cm.state.selection.main;
			for (const flowEditor of value) {
				if (
					flowEditor.from < currPosition.to &&
					flowEditor.to > currPosition.from
				) {
					cm.dispatch({
						annotations: toggleFlowEditor.of([flowEditor.id, 0]),
					});
				}
			}
		}
	}
} 