import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate, type EditorView } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isEnhancedListEnabledFile } from "./enable-scope";

const FENCE_LINE_REGEX = /^(\s*)(```+|~~~+).*/;
const LOOKBACK_LINES = 200;

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function measureIndentPx(view: EditorView, indentText: string): number {
	// Measure the rendered width of the indent prefix using the editor's font + tab-size.
	// We cannot rely on coordsAtPos because nested indentation can be tokenized/styled
	// differently across editors/themes; a probe gives stable px widths.
	const probe = document.createElement("span");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	probe.style.whiteSpace = "pre";

	const cs = window.getComputedStyle(view.contentDOM);
	probe.style.fontFamily = cs.fontFamily;
	probe.style.fontSize = cs.fontSize;
	probe.style.fontWeight = cs.fontWeight;
	probe.style.fontStyle = cs.fontStyle;
	probe.style.letterSpacing = cs.letterSpacing;
	probe.style.setProperty("tab-size", cs.getPropertyValue("tab-size"));

	probe.textContent = indentText;
	view.dom.appendChild(probe);
	const width = probe.getBoundingClientRect().width;
	probe.remove();
	return width;
}

function measureBulletMarkerVisualPx(view: EditorView): number {
	// The enhanced list handle is implemented by styling `.cm-formatting-list-ul`.
	// Measure its rendered width (incl. margin) so we can align code fences with
	// list content, not raw Markdown whitespace.
	const probe = document.createElement("span");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	probe.style.whiteSpace = "pre";
	probe.className = "cm-formatting cm-formatting-list cm-formatting-list-ul";
	probe.textContent = "- ";
	view.dom.appendChild(probe);

	const width = probe.getBoundingClientRect().width;
	const mr = parseFloat(window.getComputedStyle(probe).marginRight || "0");
	probe.remove();
	return width + mr;
}

function buildDecorations(
	view: any,
	plugin: BlockLinkPlus,
	indentWidthCache: Map<string, number>,
	markerDeltaPxCache: { value: number | null },
) {
	const builder = new RangeSetBuilder<Decoration>();

	if (!plugin.settings.enhancedListIndentCodeBlocks) {
		return builder.finish();
	}

	try {
		if (view.state.field?.(editorLivePreviewField, false) !== true) {
			return builder.finish();
		}
	} catch {
		return builder.finish();
	}

	const info = view.state.field(editorInfoField, false);
	const file = info?.file;
	if (!file) return builder.finish();
	if (!isEnhancedListEnabledFile(plugin, file)) return builder.finish();

	// Compute the px delta between the visual list marker (`- ` styled as a handle)
	// and the plain indentation used by nested fenced code blocks (`  `).
	// This lets us align code blocks with list content even after replacing the
	// bullet with a wider handle.
	let markerDeltaPx = markerDeltaPxCache.value;
	if (markerDeltaPx == null) {
		try {
			const visual = measureBulletMarkerVisualPx(view);
			const spaces = measureIndentPx(view, "  ");
			markerDeltaPx = visual - spaces;
		} catch {
			markerDeltaPx = 0;
		}
		markerDeltaPxCache.value = markerDeltaPx;
	}

	for (const { from, to } of view.visibleRanges) {
		const startLineNo = view.state.doc.lineAt(from).number;
		const endLineNo = view.state.doc.lineAt(to).number;
		const scanStartLineNo = Math.max(1, startLineNo - LOOKBACK_LINES);

		let inFence = false;
		let fenceChar = "";
		let fenceLen = 0;
		let indentText = "";
		let indentLen = 0;
		let blockIndentPx = 0;
		let openedAtLineNo = 0;

		for (let ln = scanStartLineNo; ln <= endLineNo; ln++) {
			const line = view.state.doc.line(ln);
			const text: string = line.text;

			if (!inFence) {
				const m = text.match(FENCE_LINE_REGEX);
				if (m) {
					inFence = true;
					indentText = m[1] ?? "";
					indentLen = indentText.length;
					fenceChar = (m[2] ?? "")[0] ?? "";
					fenceLen = (m[2] ?? "").length;
					openedAtLineNo = ln;
					if (indentLen > 0) {
						const cached = indentWidthCache.get(indentText);
						const indentPx =
							cached !== undefined
								? cached
								: (() => {
										const measured = measureIndentPx(view, indentText);
										indentWidthCache.set(indentText, measured);
										return measured;
									})();

						// Replace the structural indentation (whitespace) with a pixel-precise
						// indentation that matches the styled list marker width (handle).
						blockIndentPx = Math.max(0, indentPx + markerDeltaPx);
					} else {
						blockIndentPx = 0;
					}
				}
			}

			const isInViewport = line.to >= from && line.from <= to;
			if (inFence && isInViewport && indentLen > 0 && blockIndentPx > 0) {
				// Shift the entire code block line and hide only the structural indent
				// prefix. This makes nested fenced code blocks visually align with the
				// list level (Logseq-like), without modifying the file content.
				builder.add(
					line.from,
					line.from,
					Decoration.line({
						class: "blp-enhanced-list-codeblock-indented",
						attributes: {
							style: `margin-left: ${blockIndentPx}px !important; width: calc(100% - ${blockIndentPx}px) !important; box-sizing: border-box;`,
						},
					}),
				);

				const leadingWs = (text.match(/^\s*/) ?? [""])[0].length;
				const hideLen = Math.min(indentLen, leadingWs);
				if (hideLen > 0) {
					// Use `replace` (not `display:none`) so CM's position <-> DOM mapping
					// stays consistent while removing the structural whitespace visually.
					builder.add(line.from, line.from + hideLen, Decoration.replace({}));
				}
			}

			if (inFence) {
				const closeRe = new RegExp(
					`^\\s*${escapeRegex(fenceChar)}{${fenceLen},}\\s*$`,
				);
				if (fenceChar && fenceLen >= 3 && ln !== openedAtLineNo && closeRe.test(text)) {
					inFence = false;
					fenceChar = "";
					fenceLen = 0;
					indentText = "";
					indentLen = 0;
					blockIndentPx = 0;
					openedAtLineNo = 0;
				}
			}
		}
	}

	return builder.finish();
}

export function createEnhancedListCodeBlockIndentExtension(plugin: BlockLinkPlus) {
	return ViewPlugin.fromClass(
		class {
			decorations: any;
			private lastEnabled: boolean;
			private indentWidthCache = new Map<string, number>();
			private markerDeltaPxCache: { value: number | null } = { value: null };

			constructor(view: any) {
				this.decorations = buildDecorations(
					view,
					plugin,
					this.indentWidthCache,
					this.markerDeltaPxCache,
				);
				this.lastEnabled = plugin.settings.enhancedListIndentCodeBlocks;
			}

			update(update: ViewUpdate) {
				const nextEnabled = plugin.settings.enhancedListIndentCodeBlocks;
				if (
					nextEnabled !== this.lastEnabled ||
					update.docChanged ||
					update.viewportChanged
				) {
					this.lastEnabled = nextEnabled;
					this.decorations = buildDecorations(
						update.view,
						plugin,
						this.indentWidthCache,
						this.markerDeltaPxCache,
					);
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
