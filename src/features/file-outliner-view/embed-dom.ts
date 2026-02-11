/**
 * Obsidian's `MarkdownRenderer.render(...)` can produce internal markdown embeds whose DOM
 * shape differs from the native preview embed structure (notably missing `.markdown-embed-content`).
 *
 * BLP's embed post-processing (e.g. reading-range `^id-id`) assumes the native container exists.
 * Normalize embeds in the v2 file-outliner display surface to match the expected structure.
 */
export function normalizeInternalMarkdownEmbeds(root: HTMLElement): { normalized: number } {
	const embeds: HTMLElement[] = [];
	if (root.matches?.(".internal-embed.markdown-embed")) {
		embeds.push(root);
	} else {
		embeds.push(...Array.from(root.querySelectorAll<HTMLElement>(".internal-embed.markdown-embed")));
	}

	let normalized = 0;
	for (const embedEl of embeds) {
		if (normalizeOneEmbed(embedEl)) normalized += 1;
	}

	return { normalized };
}

function findDirectChildByClass(parent: HTMLElement, cls: string): HTMLElement | null {
	for (const child of Array.from(parent.children)) {
		if ((child as HTMLElement).classList?.contains(cls)) return child as HTMLElement;
	}
	return null;
}

function normalizeOneEmbed(embedEl: HTMLElement): boolean {
	const existingContent = findDirectChildByClass(embedEl, "markdown-embed-content");

	const titleEl = findDirectChildByClass(embedEl, "markdown-embed-title");
	const linkEl = findDirectChildByClass(embedEl, "markdown-embed-link");

	let contentEl = existingContent;
	let changed = false;

	if (!contentEl) {
		contentEl = document.createElement("div");
		contentEl.className = "markdown-embed-content";
		changed = true;

		// Match native embed ordering: title/link first, then content wrapper.
		const insertAfter = linkEl ?? titleEl;
		if (insertAfter?.parentElement === embedEl && typeof (insertAfter as any).after === "function") {
			(insertAfter as any).after(contentEl);
		} else if (insertAfter?.parentElement === embedEl) {
			embedEl.insertBefore(contentEl, insertAfter.nextSibling);
		} else {
			embedEl.insertBefore(contentEl, embedEl.firstChild);
		}
	}

	// Move any other direct children into the content wrapper so post-processors see the expected structure.
	const snapshot = Array.from(embedEl.childNodes);
	for (const node of snapshot) {
		if (node === titleEl) continue;
		if (node === linkEl) continue;
		if (node === contentEl) continue;
		try {
			contentEl.appendChild(node);
			changed = true;
		} catch {
			// ignore
		}
	}

	return changed;
}

