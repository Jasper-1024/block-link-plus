import { getCommandOwnerPluginId, shouldAllowEditorCommandInOutliner } from "../editor-command-bridge";

function buildPluginMock(opts?: {
	allowed?: string[];
	bridgeEnabled?: boolean;
	activeEditorBridge?: boolean;
	installedPluginIds?: string[];
	manifestId?: string;
}) {
	const installed = opts?.installedPluginIds ?? ["block-link-plus", "highlightr-plugin", "metadata-menu"];
	const manifests: Record<string, any> = {};
	for (const id of installed) manifests[id] = { id };

	return {
		manifest: { id: opts?.manifestId ?? "block-link-plus" },
		settings: {
			fileOutlinerEditorCommandBridgeEnabled: opts?.bridgeEnabled ?? true,
			fileOutlinerEditorCommandAllowedPlugins: opts?.allowed ?? ["core"],
			fileOutlinerDebugLogging: false,
		},
		app: {
			plugins: { manifests },
			workspace: {
				activeEditor: opts?.activeEditorBridge ? { __blpFileOutlinerBridge: true } : null,
			},
		},
	} as any;
}

describe("file-outliner-view/editor-command-bridge", () => {
	test("attributes installed plugin editor commands by id prefix", () => {
		const plugin = buildPluginMock();
		expect(getCommandOwnerPluginId(plugin, "highlightr-plugin:Red")).toBe("highlightr-plugin");
	});

	test("treats core commands as core", () => {
		const plugin = buildPluginMock();
		expect(getCommandOwnerPluginId(plugin, "editor:toggle-bold")).toBe("core");
		expect(getCommandOwnerPluginId(plugin, "app:open-settings")).toBe("core");
	});

	test("treats unknown plugin prefixes as core (best-effort)", () => {
		const plugin = buildPluginMock();
		expect(getCommandOwnerPluginId(plugin, "unknown-plugin:do-thing")).toBe("core");
	});

	test("does not gate when Outliner bridge is inactive", () => {
		const plugin = buildPluginMock({ activeEditorBridge: false, allowed: [] });
		const cmd = { id: "highlightr-plugin:Red", editorCallback: () => {} };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(true);
	});

	test("gates editor commands by allowlist when Outliner bridge is active", () => {
		const plugin = buildPluginMock({ activeEditorBridge: true, allowed: ["core"] });
		const cmd = { id: "highlightr-plugin:Red", editorCallback: () => {} };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(false);
	});

	test("allows editor commands when plugin id is allowlisted", () => {
		const plugin = buildPluginMock({ activeEditorBridge: true, allowed: ["core", "highlightr-plugin"] });
		const cmd = { id: "highlightr-plugin:Red", editorCallback: () => {} };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(true);
	});

	test("does not block non-editor commands even when bridge is active", () => {
		const plugin = buildPluginMock({ activeEditorBridge: true, allowed: ["core"] });
		const cmd = { id: "daily-notes:open-today", callback: () => {} };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(true);
	});

	test("always allows BLP editor commands (avoid self-lockout)", () => {
		const plugin = buildPluginMock({ activeEditorBridge: true, allowed: [] });
		const cmd = { id: "block-link-plus:copy-link-to-block", editorCheckCallback: () => true };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(true);
	});

	test("bridge disabled disables gating", () => {
		const plugin = buildPluginMock({ activeEditorBridge: true, allowed: [], bridgeEnabled: false });
		const cmd = { id: "highlightr-plugin:Red", editorCallback: () => {} };
		expect(shouldAllowEditorCommandInOutliner(plugin, cmd)).toBe(true);
	});
});

