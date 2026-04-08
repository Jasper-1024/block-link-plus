import { normalizePath, TFile } from "obsidian";
import moment from "moment";

export type DailySource = { file: TFile; ts: number };

function normalizeFolderPath(input: unknown): string {
	return normalizePath(String(input ?? "").trim()).replace(/^\/+/, "").replace(/\/+$/, "");
}

function scanDailyNotesByFolderAndFormat(
	app: any,
	opts: { folderPath: string; format: string }
): DailySource[] {
	const vault = app?.vault;
	if (!vault?.getFiles) return [];

	const normalizedFolder = normalizeFolderPath(opts.folderPath);
	const out: DailySource[] = [];
	const basenameFormat = String(opts.format ?? "").split(/[\\/]/).pop() || String(opts.format ?? "");

	let files: any[] = [];
	try {
		files = vault.getFiles?.() ?? [];
	} catch {
		return [];
	}

	for (const f of files) {
		if (!(f instanceof TFile)) continue;
		if (f.extension?.toLowerCase() !== "md") continue;

		const filePath = normalizePath(String(f.path ?? ""));
		if (normalizedFolder && !filePath.startsWith(normalizedFolder + "/")) continue;

		const rel = normalizedFolder ? filePath.slice(normalizedFolder.length + 1) : filePath;
		if (!rel.toLowerCase().endsWith(".md")) continue;
		const relNoExt = rel.slice(0, -3);

		const basenameNoExt = String((f as any).basename ?? "")
			.trim();

		let parsed = moment(relNoExt, opts.format, true);
		if (!parsed.isValid()) {
			parsed = moment(basenameNoExt, basenameFormat, true);
		}
		if (!parsed.isValid()) continue;
		const ts = parsed.startOf("day").valueOf();
		if (!Number.isFinite(ts)) continue;

		out.push({ file: f, ts });
	}

	return out;
}

function getDailyNotesInternal(app: any): { enabled: boolean; instance: any | null } {
	try {
		const p = app?.internalPlugins?.getPluginById?.("daily-notes");
		return { enabled: p?.enabled === true, instance: p?.instance ?? null };
	} catch {
		return { enabled: false, instance: null };
	}
}

export function resolveDailySources(
	app: any
):
	| { ok: true; folderPath: string; format: string; sources: DailySource[] }
	| { ok: false; reason: string } {
	const daily = getDailyNotesInternal(app);
	if (!daily.enabled || !daily.instance) {
		return { ok: false, reason: "Daily Notes is disabled or unavailable." };
	}

	const inst = daily.instance;

	let folderPath = "/";
	try {
		const folderObj = inst.getFolder?.();
		folderPath = folderObj?.path ?? (typeof folderObj === "string" ? folderObj : "/");
	} catch {
		// ignore
	}

	let format = "YYYY-MM-DD";
	try {
		const f = inst.getFormat?.();
		if (typeof f === "string" && f.trim()) format = f.trim();
	} catch {
		// ignore
	}

	const sources: DailySource[] = [];
	try {
		inst.iterateDailyNotes?.((file: any, ts: any) => {
			if (!(file instanceof TFile)) return;
			if (file.extension?.toLowerCase() !== "md") return;
			const n = Number(ts);
			if (!Number.isFinite(n)) return;
			sources.push({ file, ts: n });
		});
	} catch {
		// ignore
	}

	const scanned = scanDailyNotesByFolderAndFormat(app, { folderPath, format });
	if (scanned.length > 0) {
		const existing = new Set<string>(sources.map((s) => normalizePath(s.file.path)));
		for (const s of scanned) {
			const p = normalizePath(s.file.path);
			if (existing.has(p)) continue;
			existing.add(p);
			sources.push(s);
		}
	}

	sources.sort((a, b) => b.ts - a.ts);

	return { ok: true, folderPath, format, sources };
}

export function chooseStartIndex(sources: DailySource[], opts?: { todayTs?: number }): number {
	if (sources.length === 0) return 0;
	const todayTs = opts?.todayTs ?? moment().startOf("day").valueOf();
	const idxToday = sources.findIndex((s) => s.ts === todayTs);
	if (idxToday >= 0) return idxToday;
	const idxLeToday = sources.findIndex((s) => s.ts <= todayTs);
	if (idxLeToday >= 0) return idxLeToday;
	return 0;
}
