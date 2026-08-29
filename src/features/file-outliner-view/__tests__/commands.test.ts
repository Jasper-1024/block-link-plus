jest.mock("obsidian", () => {
	const actual = jest.requireActual("obsidian") as Record<string, unknown>;

	class DetachedWorkspaceLeaf {
		app: any;
		view: any = null;
		detach = jest.fn();

		constructor(app: any) {
			this.app = app;
		}

		async setViewState(): Promise<void> {
			this.view = this.app.__nextOutlinerView;
		}
	}

	class RegisteredMarkdownRenderChild {
		containerEl: HTMLElement;
		private readonly unloadCallbacks: Array<() => void> = [];

		constructor(containerEl: HTMLElement) {
			this.containerEl = containerEl;
		}

		load(): void {}

		register(callback: () => void): void {
			this.unloadCallbacks.push(callback);
		}

		unload(): void {
			for (const callback of this.unloadCallbacks.splice(0)) callback();
		}
	}

	return {
		...actual,
		WorkspaceLeaf: DetachedWorkspaceLeaf,
		MarkdownRenderChild: RegisteredMarkdownRenderChild,
	};
});

import { FILE_OUTLINER_VIEW_TYPE } from "../constants";
import { registerFileOutlinerCommands } from "../commands";
import { OutlinerEmbedLeafManager } from "../../journal-feed-view/OutlinerEmbedLeafManager";

function buildPlugin(view: any, detachedViews: any[] = []) {
	return {
		app: {
			__nextOutlinerView: null,
			workspace: {
				activeLeaf: { view },
				getLeavesOfType: jest.fn(() => detachedViews.map((detachedView) => ({ view: detachedView }))),
			},
		},
		addCommand: jest.fn(),
	} as any;
}

function registeredCommand(plugin: any, key: string): any {
	return plugin.addCommand.mock.calls.map(([command]: [any]) => command).find((command: any) => command.hotkeys?.[0]?.key === key);
}

describe("file-outliner-view movement commands", () => {
	test("registers default Alt+Arrow commands and dispatches exactly once", () => {
		const view = {
			getViewType: () => FILE_OUTLINER_VIEW_TYPE,
			isActiveBlockEditorFocused: () => true,
			moveActiveBlock: jest.fn(() => true),
		};
		const plugin = buildPlugin(view);

		registerFileOutlinerCommands(plugin);

		const up = registeredCommand(plugin, "ArrowUp");
		const down = registeredCommand(plugin, "ArrowDown");
		expect(up).toBeDefined();
		expect(down).toBeDefined();
		expect(up.hotkeys).toEqual([{ modifiers: ["Alt"], key: "ArrowUp" }]);
		expect(down.hotkeys).toEqual([{ modifiers: ["Alt"], key: "ArrowDown" }]);

		expect(up.checkCallback(true)).toBe(true);
		expect(up.checkCallback(false)).toBe(true);
		expect(view.moveActiveBlock).toHaveBeenCalledTimes(1);
		expect(view.moveActiveBlock).toHaveBeenCalledWith("up");

		expect(down.checkCallback(false)).toBe(true);
		expect(view.moveActiveBlock).toHaveBeenCalledTimes(2);
		expect(view.moveActiveBlock).toHaveBeenLastCalledWith("down");
	});

	test("finds a focused manager-owned detached embed outside workspace leaf discovery", async () => {
		const activeView = { getViewType: () => "markdown" };
		const detachedView = {
			getViewType: () => FILE_OUTLINER_VIEW_TYPE,
			isActiveBlockEditorFocused: jest.fn(() => true),
			moveActiveBlock: jest.fn(() => true),
		};
		const plugin = buildPlugin(activeView);
		(plugin.app as any).__nextOutlinerView = detachedView;
		const manager = new OutlinerEmbedLeafManager(plugin as any);
		const embed = await manager.createEmbedLeaf({
			containerEl: document.createElement("div"),
			file: { path: "daily.md" } as any,
			sourcePath: "journal.md",
		});

		expect(embed.leaf).toBeDefined();

		registerFileOutlinerCommands(plugin);

		const up = registeredCommand(plugin, "ArrowUp");
		expect(up.checkCallback(true)).toBe(true);
		expect(plugin.app.workspace.getLeavesOfType).toHaveBeenCalled();
		expect(plugin.app.workspace.getLeavesOfType).toHaveReturnedWith([]);
		expect(up.checkCallback(false)).toBe(true);
		expect(detachedView.moveActiveBlock).toHaveBeenCalledTimes(1);

		manager.detach(embed);
		expect(up.checkCallback(true)).toBe(false);
	});
});
