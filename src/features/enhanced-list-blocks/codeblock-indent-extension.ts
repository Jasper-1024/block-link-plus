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

function findClosestCmLine(node: any): HTMLElement | null {
	// `domAtPos()` may return a Text node; normalize to an Element before `closest()`.
	const el: Element | null =
		node instanceof Element ? node : (node?.parentElement as Element | null);
	return (el?.closest?.(".cm-line") as HTMLElement | null) ?? null;
}

function parsePx(value: string | null | undefined): number | null {
	if (!value) return null;
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

function readListPaddingInlineStartPx(view: EditorView, lineFrom: number): number | null {
	try {
		const domAt = view.domAtPos(lineFrom);
		const lineEl = findClosestCmLine(domAt?.node);
		if (!lineEl) return null;

		const cs = window.getComputedStyle(lineEl);
		// Prefer the physical inline-start padding because JSDOM doesn't consistently resolve
		// logical <-> physical properties. For RTL notes, inline-start maps to right.
		const dir = (cs.direction || "ltr").toLowerCase();
		const phys = dir === "rtl" ? parsePx(cs.paddingRight) : parsePx(cs.paddingLeft);
		const logical = parsePx((cs as any).paddingInlineStart);
		const physInline = dir === "rtl" ? parsePx(lineEl.style.paddingRight) : parsePx(lineEl.style.paddingLeft);
		const logicalInline = parsePx((lineEl.style as any).paddingInlineStart);

		// Treat `0` as "unset" so we can fall back to other properties.
		for (const v of [phys, logical, physInline, logicalInline]) {
			if (v != null && v > 0) return v;
		}
		return null;
	} catch {
		return null;
	}
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

function approximateIndentPx(view: EditorView, indentText: string): number {
	// JSDOM (tests) and some edge cases can return 0 for DOM measurements.
	// Use a character-width based fallback so indentation still works.
	const cwRaw = Number.isFinite((view as any).defaultCharacterWidth) ? view.defaultCharacterWidth : 0;
	const cw = cwRaw > 0 ? cwRaw : 8;
	const tsRaw = Number.isFinite((view as any).state?.tabSize) ? view.state.tabSize : 0;
	const tabSize = tsRaw > 0 ? tsRaw : 4;

	let col = 0;
	for (const ch of indentText) {
		if (ch === "\t") {
			// Advance to next tab stop.
			const step = tabSize - (col % tabSize);
			col += step;
		} else {
			// Treat all other whitespace as 1 column.
			col += 1;
		}
	}

	return col * cw;
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
	codePadPxCache: { value: number | null },
	listIndentProbe?: { didRead: boolean },
	listIndentCache?: Map<number, number>,
) {
	const builder = new RangeSetBuilder<Decoration>();
	const MIN_VALID_LIST_INDENT_PX = 6;
	if (listIndentProbe) listIndentProbe.didRead = false;
	// Track list indentation (px) for recently-seen lines in the viewport.
	// Obsidian applies list indentation via line-level padding/text-indent, but fenced
	// code block lines don't always get that styling. We reuse the nearest list line's
	// padding-inline-start to align the shifted code block with surrounding list content.
	const listIndentByLeadingWs = new Map<number, number>();

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
			const leadingWs = (text.match(/^\s*/) ?? [""])[0].length;

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
						// Prefer the list indentation used by nearby list lines in the viewport.
						// This avoids small alignment drift caused by measuring indentation under
						// code block fonts/tab-size, and matches Obsidian's own list layout.
						let listIndentPx: number | null = null;
						if (listIndentByLeadingWs.has(indentLen)) {
							listIndentPx = listIndentByLeadingWs.get(indentLen) ?? null;
						} else if (listIndentCache?.has(indentLen)) {
							listIndentPx = listIndentCache.get(indentLen) ?? null;
						} else {
							// Fall back to the closest shallower indent (e.g., bullet line) since
							// bullet + continuation lines are already aligned by Obsidian.
							let bestKey = -1;
							// NOTE: do not use `0` here. Top-level bullet lines often have small/odd
							// padding values (paired with negative text-indent), which would cause
							// a temporary "jump left" while Live Preview list styling settles.
							const candidates: number[] = [
								...listIndentByLeadingWs.keys(),
								...(listIndentCache ? listIndentCache.keys() : []),
							];
							for (const key of candidates) {
								if (key > 0 && key <= indentLen && key > bestKey) bestKey = key;
							}

							if (bestKey > 0) {
								listIndentPx =
									listIndentByLeadingWs.get(bestKey) ??
									(listIndentCache?.get(bestKey) ?? null);
							}
						}

						// Treat suspiciously-small values as "not yet styled" (e.g., transient Live Preview
						// state right after an edit). Falling back avoids a visible jump-left flicker.
						if (listIndentPx != null && listIndentPx > 0 && listIndentPx < MIN_VALID_LIST_INDENT_PX) {
							listIndentPx = null;
						}

						if (listIndentPx != null) {
							// Shift by the delta between the surrounding list indentation and the
							// current code-fence line indentation. This avoids a constant drift when
							// the theme applies a base padding to all `.cm-line`s.
							// IMPORTANT: avoid using the opening fence line as the padding sample.
							// In Obsidian Live Preview, the opening fence line is often rendered as a
							// header widget (language label) and can transiently inherit list padding
							// right after edits, causing a brief "jump left" flicker.
							let sampleFrom = line.from;
							try {
								if (ln < view.state.doc.lines) {
									sampleFrom = view.state.doc.line(ln + 1).from;
								}
							} catch {
								// ignore
							}
							// The code block line's own padding can also settle across ticks right
							// after edits in Live Preview. If we sample during that transient state,
							// we'd compute a too-large margin-left that "snaps" later.
							//
							// Cache the last known positive padding so we can avoid jumpy deltas.
							const measuredCodePadPx = readListPaddingInlineStartPx(view, sampleFrom);
							if (measuredCodePadPx != null && measuredCodePadPx > 0) {
								codePadPxCache.value = Math.max(codePadPxCache.value ?? 0, measuredCodePadPx);
							}
							const codePadPx = measuredCodePadPx ?? codePadPxCache.value ?? 0;
							blockIndentPx = Math.max(0, listIndentPx - codePadPx);
						} else {
							// Fallback: approximate based on raw indentation + marker delta.
							const cached = indentWidthCache.get(indentText);
							const indentPxRaw =
								cached !== undefined
									? cached
									: (() => {
											let measured = measureIndentPx(view, indentText);
											if (!(measured > 0)) measured = approximateIndentPx(view, indentText);
											indentWidthCache.set(indentText, measured);
											return measured;
										})();

							// Replace the structural indentation (whitespace) with a pixel-precise
							// indentation that matches the styled list marker width (handle).
							blockIndentPx = Math.max(0, indentPxRaw + markerDeltaPx);
						}
					} else {
						blockIndentPx = 0;
					}
				} else {
					// Cache the list indentation of nearby (viewport) lines so code fences can
					// snap to the same visual column as other list continuation lines.
					// Skip fence lines themselves, because they are precisely the lines that may
					// be missing list indentation styling in Live Preview.
					if (line.to >= from && line.from <= to && !listIndentByLeadingWs.has(leadingWs)) {
						const px = readListPaddingInlineStartPx(view, line.from);
						if (px != null) {
							// For indented continuation lines, ignore tiny paddings that happen transiently
							// before Obsidian's list-line styling settles (otherwise code blocks "jump left").
							if (leadingWs > 0 && px < MIN_VALID_LIST_INDENT_PX) {
								// skip
							} else {
								listIndentByLeadingWs.set(leadingWs, px);
								if (listIndentCache) {
									const prev = listIndentCache.get(leadingWs);
									// Do not overwrite a stable cached indent with a transient tiny value.
									if (
										!(
											prev != null &&
											prev >= MIN_VALID_LIST_INDENT_PX &&
											px < MIN_VALID_LIST_INDENT_PX
										)
									) {
										listIndentCache.set(leadingWs, px);
									}
								}
								if (listIndentProbe) listIndentProbe.didRead = true;
							}
						}
					}
				}
			}

			const isInViewport = line.to >= from && line.from <= to;
			if (inFence && isInViewport && indentLen > 0) {
				// Shift the entire code block line (when needed) and hide only the structural
				// indent prefix. This makes nested fenced code blocks visually align with the
				// list level (Logseq-like), without modifying the file content.
				const lineSpec: any = { class: "blp-enhanced-list-codeblock-indented" };
				if (blockIndentPx > 0) {
					lineSpec.attributes = {
						style: `margin-left: ${blockIndentPx}px !important; width: calc(100% - ${blockIndentPx}px) !important; box-sizing: border-box;`,
					};
				}
				builder.add(
					line.from,
					line.from,
					Decoration.line(lineSpec),
				);

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
			private codePadPxCache: { value: number | null } = { value: null };
			private listIndentProbe: { didRead: boolean } = { didRead: false };
			private hasMeasuredListIndent = false;
			private listIndentCache = new Map<number, number>();
			private lastFilePath: string | null = null;

			constructor(view: any) {
				this.decorations = buildDecorations(
					view,
					plugin,
					this.indentWidthCache,
					this.markerDeltaPxCache,
					this.codePadPxCache,
					this.listIndentProbe,
					this.listIndentCache,
				);
				if (this.listIndentProbe.didRead) this.hasMeasuredListIndent = true;
				try {
					const info = view.state.field(editorInfoField, false);
					this.lastFilePath = info?.file?.path ?? null;
				} catch {
					this.lastFilePath = null;
				}
				this.lastEnabled = plugin.settings.enhancedListIndentCodeBlocks;
			}

			update(update: ViewUpdate) {
				const nextEnabled = plugin.settings.enhancedListIndentCodeBlocks;
				const enabledChanged = nextEnabled !== this.lastEnabled;
				const geometryChanged = (update as any).geometryChanged || update.heightChanged;

				let filePath: string | null = null;
				try {
					const info = update.view.state.field(editorInfoField, false);
					filePath = info?.file?.path ?? null;
				} catch {
					filePath = null;
				}
				// `editorInfoField` can be transiently unavailable during some Obsidian updates.
				// Only treat it as a file change when we have a concrete path.
				const fileChanged = filePath != null && filePath !== this.lastFilePath;

				// File/enable changes should reset all caches.
				if (fileChanged || (enabledChanged && nextEnabled)) {
					this.indentWidthCache.clear();
					this.markerDeltaPxCache.value = null;
					this.codePadPxCache.value = null;
					this.hasMeasuredListIndent = false;
					this.listIndentCache.clear();
					this.lastFilePath = filePath;
				}

				// Geometry changes can affect character widths and marker measurement; clear those
				// caches, but keep listIndentCache so we can avoid transient jump-left flicker
				// while Live Preview list styling settles right after an edit.
				if (geometryChanged) {
					this.indentWidthCache.clear();
					this.markerDeltaPxCache.value = null;
					// Code block padding is DOM/CSS-driven and can transiently disappear right after
					// edits (even when geometry changes). Keep a last-known value across edits so
					// we don't compute a "jump right" margin-left. Only reset it on non-edit
					// geometry changes (e.g. theme/font changes).
					if (!update.docChanged) this.codePadPxCache.value = null;
				}

				// Reading list indentation relies on DOM styles that may not be available during
				// the very first constructor pass. Recompute once when the user first moves the
				// caret so we can calibrate against Obsidian's list layout.
				const needsInitialIndentProbe =
					nextEnabled && update.selectionSet && !this.hasMeasuredListIndent;

				if (enabledChanged || update.docChanged || update.viewportChanged || geometryChanged || needsInitialIndentProbe) {
					this.lastEnabled = nextEnabled;
					this.decorations = buildDecorations(
						update.view,
						plugin,
						this.indentWidthCache,
						this.markerDeltaPxCache,
						this.codePadPxCache,
						this.listIndentProbe,
						this.listIndentCache,
					);
					if (this.listIndentProbe.didRead) this.hasMeasuredListIndent = true;
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
