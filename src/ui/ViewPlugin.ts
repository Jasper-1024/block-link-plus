import {
	Decoration,
	MatchDecorator,
	ViewPlugin,
} from "@codemirror/view";
import { BlockLinkPlusViewPlugin } from "../types";

export function createViewPlugin(
	rule: string = "(^| )˅[a-zA-Z0-9_]+$"
): BlockLinkPlusViewPlugin {
	let decorator = new MatchDecorator({
		regexp: new RegExp(rule, "g"),
		decoration: () => {
			return Decoration.mark({ class: "small-font" });
		}
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
