import { addOpenAsOutlinerPaneMenuItems } from "../markdown-pane-menu";
import { getFileOutlinerPaneMenuLabels } from "../pane-menu-labels";

function createTestMenu() {
	let separators = 0;
	const items: Array<{ title: string; icon: string; click: (() => void) | null }> = [];

	const menu = {
		addSeparator: () => {
			separators += 1;
		},
		addItem: (cb: any) => {
			let title = "";
			let icon = "";
			let click: (() => void) | null = null;

			const item = {
				setTitle: (next: string) => {
					title = next;
					return item;
				},
				setIcon: (next: string) => {
					icon = next;
					return item;
				},
				onClick: (fn: () => void) => {
					click = fn;
					return item;
				},
			};

			cb(item);
			items.push({ title, icon, click });
		},
	};

	return { menu, getSeparators: () => separators, items };
}

describe("file-outliner-view/markdown-pane-menu", () => {
	test("adds Open as Outliner items and wires click handlers", () => {
		const { menu, getSeparators, items } = createTestMenu();
		const calls: string[] = [];

		addOpenAsOutlinerPaneMenuItems(menu as any, {
			openSameLeaf: () => calls.push("same"),
			openNewTab: () => calls.push("tab"),
		});

		const labels = getFileOutlinerPaneMenuLabels();
		expect(getSeparators()).toBe(1);
		expect(items.map((i) => i.title)).toEqual([
			labels.openAsOutliner,
			labels.openAsOutlinerNewTab,
		]);
		expect(items.map((i) => i.icon)).toEqual(["list", "copy"]);

		items[0].click?.();
		items[1].click?.();
		expect(calls).toEqual(["same", "tab"]);
	});
});
