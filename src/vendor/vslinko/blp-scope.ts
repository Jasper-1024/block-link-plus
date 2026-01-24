export const BLP_VSLINKO_SCOPE_CLASS = "blp-vslinko-scope";

export function isEditorViewInBlpVslinkoScope(view: { dom?: HTMLElement } | null | undefined): boolean {
	try {
		return Boolean(view?.dom?.classList?.contains(BLP_VSLINKO_SCOPE_CLASS));
	} catch {
		return false;
	}
}

export function isHTMLElementInBlpVslinkoScope(target: HTMLElement | null | undefined): boolean {
	try {
		const editor = target?.closest?.(".cm-editor") as HTMLElement | null;
		return Boolean(editor?.classList?.contains(BLP_VSLINKO_SCOPE_CLASS));
	} catch {
		return false;
	}
}

