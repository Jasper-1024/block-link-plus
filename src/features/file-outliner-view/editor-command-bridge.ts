import { around } from "monkey-around";

import type BlockLinkPlus from "../../main";

function normalizePluginId(raw: unknown): string {
	const s = String(raw ?? "").trim().toLowerCase();
	return s ? s : "core";
}

function getAllowlistedPluginIds(plugin: BlockLinkPlus): Set<string> {
	const raw = Array.isArray(plugin.settings.fileOutlinerEditorCommandAllowedPlugins)
		? plugin.settings.fileOutlinerEditorCommandAllowedPlugins
		: [];
	const out = new Set(raw.map(normalizePluginId).filter(Boolean));

	// Keep BLP commands usable even when users overly-restrict the allowlist.
	out.add(normalizePluginId(plugin.manifest?.id ?? "block-link-plus"));

	return out;
}

function isFileOutlinerActiveEditorBridge(activeEditor: any): boolean {
	return !!activeEditor && (activeEditor as any).__blpFileOutlinerBridge === true;
}

function isEditorCommand(command: any): boolean {
	if (!command) return false;
	if (typeof command.editorCallback === "function") return true;
	if (typeof command.editorCheckCallback === "function") return true;
	if (typeof command.id === "string" && command.id.startsWith("editor:")) return true;
	return false;
}

function getInstalledPluginIdSet(plugin: BlockLinkPlus): Set<string> {
	const manifests = (plugin.app as any)?.plugins?.manifests;
	const ids = manifests && typeof manifests === "object" ? Object.keys(manifests) : [];
	return new Set(ids.map(normalizePluginId));
}

export function getCommandOwnerPluginId(plugin: BlockLinkPlus, commandId: unknown): string {
	const id = String(commandId ?? "");
	const prefix = normalizePluginId(id.includes(":") ? id.split(":")[0] : "");
	if (!prefix || prefix === "core") return "core";

	const installed = getInstalledPluginIdSet(plugin);
	return installed.has(prefix) ? prefix : "core";
}

export function shouldAllowEditorCommandInOutliner(plugin: BlockLinkPlus, command: any): boolean {
	if (plugin.settings.fileOutlinerEditorCommandBridgeEnabled === false) return true;

	const activeEditor = (plugin.app.workspace as any)?.activeEditor;
	if (!isFileOutlinerActiveEditorBridge(activeEditor)) return true;

	if (!isEditorCommand(command)) return true;

	const allowed = getAllowlistedPluginIds(plugin);
	const owner = getCommandOwnerPluginId(plugin, command?.id);
	return allowed.has(owner);
}

/**
 * Strict gate for editor commands while Outliner provides a bridged `workspace.activeEditor`.
 *
 * We only gate editor commands (editorCallback/editorCheckCallback). Non-editor commands remain unaffected.
 */
export function registerFileOutlinerEditorCommandBridge(plugin: BlockLinkPlus): void {
	try {
		const uninstall = around(plugin.app.commands as any, {
			executeCommand: (old: any) => {
				return function (command: any, ...args: any[]) {
					try {
						if (!shouldAllowEditorCommandInOutliner(plugin, command)) {
							if (plugin.settings.fileOutlinerDebugLogging === true) {
								console.debug("[BLP Outliner] blocked editor command", String(command?.id ?? ""));
							}
							return false;
						}
					} catch (err) {
						// Best-effort: never break command execution due to our gate.
						if (plugin.settings.fileOutlinerDebugLogging === true) {
							console.error("[BLP Outliner] editor command gate failed", err);
						}
					}

					return old.call(this, command, ...args);
				};
			},
		});

		plugin.register(uninstall);
	} catch (err) {
		console.error("FileOutliner: failed to patch commands.executeCommand for editor command bridge", err);
	}
}

