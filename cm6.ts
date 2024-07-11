import { MatchDecorator, Decoration, EditorView, ViewPlugin, DecorationSet, ViewUpdate, PluginValue, WidgetType, PluginSpec } from "@codemirror/view";

class TinyLinkPlugin implements PluginValue {
	decorator: MatchDecorator;
	decorations: DecorationSet = Decoration.none;
	regxPattern = "(^| )˅[a-zA-Z0-9_]+$";

	constructor(view: EditorView) {
		this.decorator = new MatchDecorator({
			regexp: new RegExp(this.regxPattern, "g"),
			decorate: (add, from, to, match, view) => {
				console.log("match", match);
				let deco = Decoration.mark({ class: 'small-font' });
				add(from, to, deco);
			},
		});

		this.decorations = this.decorator.createDeco(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.decorator.updateDeco(update, this.decorations);
		}
	}

	destroy() { }
}

const pluginSpec: PluginSpec<TinyLinkPlugin> = {
	decorations: (value: TinyLinkPlugin) => value.decorations,
};

export const tinyLinkPlugin = ViewPlugin.fromClass(
	TinyLinkPlugin,
	pluginSpec
);