import { BLP_BLOCK_MARKER } from "shared/block-marker";

const MARKER_HEADING_RE = new RegExp(`^${BLP_BLOCK_MARKER}[a-zA-Z0-9_-]+$`);

/**
 * Reading mode: hide BLP's internal marker-only headings like `## ˅abc123`.
 *
 * We intentionally keep the scope narrow (heading-only + marker-only) to avoid the
 * historical issue of postprocessors blanking unrelated content.
 */
export function blockMarkerMarkdownPostProcessor(el: HTMLElement): void {
	// Skip outliner view's internal MarkdownRenderer renders.
	if (el.closest(".blp-file-outliner-view")) return;

	const headings = el.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
	if (headings.length === 0) return;

	for (const heading of Array.from(headings)) {
		const text = (heading.textContent ?? "").trim();
		if (!MARKER_HEADING_RE.test(text)) continue;

		// Only strip the exact marker token text node; leave anchor/collapse controls intact.
		for (const node of Array.from(heading.childNodes)) {
			if (node.nodeType !== Node.TEXT_NODE) continue;
			const nodeText = (node.textContent ?? "").trim();
			if (MARKER_HEADING_RE.test(nodeText)) {
				node.textContent = "";
			}
		}
	}
}
