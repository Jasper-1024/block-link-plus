import { TFile } from "obsidian";
import moment from "moment";

export type DailySource = { file: TFile; ts: number };

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

