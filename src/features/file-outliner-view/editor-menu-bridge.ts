export type MenuLike = {
	addItem: (cb: (item: any) => void) => void;
	addSeparator: () => void;
	addSubmenu?: (cb: (item: any) => void) => void;
};

export type PluginFilteredMenuOpts = {
	allowedPluginIds: ReadonlySet<string>;
	blockedPluginIds?: ReadonlySet<string>;
	getStack?: () => string;
};

export function extractPluginIdFromStack(stack: string | null | undefined): string | null {
	const s = String(stack ?? "");
	if (!s) return null;

	// Obsidian often uses `plugin:<id>:<line>:<col>` in stack frames.
	// NOTE: This returns the *first* plugin id found; callers that run inside our own wrapper
	// should prefer scanning for the first non-blocked plugin id instead.
	const m1 = s.match(/plugin:([^:\n]+):/);
	if (m1?.[1]) return m1[1];

	// Fallback for file paths that include `.../plugins/<id>/...` or `...\\plugins\\<id>\\...`.
	const m2 = s.match(/[\\/]+plugins[\\/]+([^\\/\r\n]+)[\\/]/);
	if (m2?.[1]) return m2[1];

	return null;
}

function normalizePluginId(raw: string | null | undefined): string {
	const s = String(raw ?? "").trim();
	return s ? s.toLowerCase() : "core";
}

function extractPluginIdsFromStack(stack: string | null | undefined): string[] {
	const s = String(stack ?? "");
	if (!s) return [];

	const ids: string[] = [];

	// Prefer explicit `plugin:<id>:` frames.
	{
		const re = /plugin:([^:\n]+):/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s))) {
			if (m[1]) ids.push(m[1]);
		}
	}

	// Fallback to file paths that include `.../plugins/<id>/...` or `...\\plugins\\<id>\\...`.
	if (ids.length === 0) {
		const re = /[\\/]+plugins[\\/]+([^\\/\r\n]+)[\\/]/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(s))) {
			if (m[1]) ids.push(m[1]);
		}
	}

	return ids;
}

function shouldAllowPluginId(pluginId: string, allowed: ReadonlySet<string>, blocked?: ReadonlySet<string>): boolean {
	if (blocked && blocked.has(pluginId)) return false;
	return allowed.has(pluginId);
}

/**
 * Temporarily patches `menu.addItem/addSeparator/addSubmenu` to allow only additions that can
 * be attributed to allowlisted plugin ids, based on call-site stack traces.
 *
 * This is best-effort and intentionally "fail closed": when we can't attribute an item, it is
 * treated as `"core"`.
 */
export function withPluginFilteredMenu(menu: MenuLike, opts: PluginFilteredMenuOpts, run: () => void): void {
	const allowed = new Set(Array.from(opts.allowedPluginIds ?? []).map(normalizePluginId));
	if (allowed.size === 0) return run();

	const blocked = opts.blockedPluginIds
		? new Set(Array.from(opts.blockedPluginIds).map(normalizePluginId))
		: undefined;

	const getStack =
		typeof opts.getStack === "function" ? opts.getStack : () => String(new Error("blp-menu-stack").stack ?? "");

	const anyMenu = menu as any;
	const baseAddItem = typeof anyMenu.addItem === "function" ? anyMenu.addItem.bind(menu) : null;
	const baseAddSeparator = typeof anyMenu.addSeparator === "function" ? anyMenu.addSeparator.bind(menu) : null;
	const baseAddSubmenu = typeof anyMenu.addSubmenu === "function" ? anyMenu.addSubmenu.bind(menu) : null;

	if (!baseAddItem || !baseAddSeparator) return run();

	const allowCurrentCallSite = (): boolean => {
		const stack = getStack();
		const candidates = extractPluginIdsFromStack(stack).map(normalizePluginId);
		// Our wrapper code is frequently the first `plugin:` frame; skip blocked ids to attribute
		// additions to the actual contributing plugin when possible.
		const pluginId = candidates.find((id) => !(blocked && blocked.has(id))) ?? "core";
		return shouldAllowPluginId(pluginId, allowed, blocked);
	};

	try {
		anyMenu.addItem = (cb: (item: any) => void) => {
			if (!allowCurrentCallSite()) return;
			return baseAddItem(cb);
		};
		anyMenu.addSeparator = () => {
			if (!allowCurrentCallSite()) return;
			return baseAddSeparator();
		};
		if (baseAddSubmenu) {
			anyMenu.addSubmenu = (cb: (item: any) => void) => {
				if (!allowCurrentCallSite()) return;
				return baseAddSubmenu(cb);
			};
		}

		run();
	} finally {
		anyMenu.addItem = baseAddItem;
		anyMenu.addSeparator = baseAddSeparator;
		if (baseAddSubmenu) anyMenu.addSubmenu = baseAddSubmenu;
	}
}
