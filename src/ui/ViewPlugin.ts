import {
	Decoration,
	MatchDecorator,
	ViewPlugin,
} from "@codemirror/view";
import { BlockLinkPlusViewPlugin } from "../types";
import { BLP_BLOCK_MARKER_CLASS, BLP_BLOCK_MARKER_RULE } from "shared/block-marker";

export function createViewPlugin(
	rule: string = BLP_BLOCK_MARKER_RULE
): BlockLinkPlusViewPlugin {
	let decorator = new MatchDecorator({
		regexp: new RegExp(rule, "g"),
		decoration: () => {
			return Decoration.mark({ class: BLP_BLOCK_MARKER_CLASS });
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
