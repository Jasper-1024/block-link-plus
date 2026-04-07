import { TFile } from "obsidian";
import type BlockLinkPlus from "../../main";

export const JOURNAL_FEED_FRONTMATTER_KEY = "blp_journal_view";

function parseFrontmatterBool(raw: unknown): boolean {
	return raw === true || raw === "true" || raw === 1;
}

export function isJournalFeedAnchorFile(plugin: BlockLinkPlus, file: TFile): boolean {
	const ext = String((file as any)?.extension ?? "").toLowerCase();
	const path = String((file as any)?.path ?? "");
	if ((ext && ext !== "md") || (!ext && !path.toLowerCase().endsWith(".md"))) return false;

	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter as Record<string, unknown> | undefined;
	if (!fm) return false;

	if (!Object.prototype.hasOwnProperty.call(fm, JOURNAL_FEED_FRONTMATTER_KEY)) return false;
	return parseFrontmatterBool(fm[JOURNAL_FEED_FRONTMATTER_KEY]);
}

function parseFrontmatterFromText(text: string): Record<string, unknown> | null {
	const raw = String(text ?? "").replace(/^\uFEFF/, "");
	if (!raw.startsWith("---")) return null;

	// Avoid scanning extremely large files; frontmatter should be near the top.
	const head = raw.slice(0, 24_000);
	const match = head.match(/^---\s*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\s*(?:\r?\n|$)/);
	if (!match) return null;

	const fm: Record<string, unknown> = {};
	const lines = match[1].split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("#")) continue;

		const colon = trimmed.indexOf(":");
		if (colon <= 0) continue;

		const key = trimmed.slice(0, colon).trim();
		if (!key) continue;

		const rawValue = trimmed.slice(colon + 1).trim();
		if (!rawValue) {
			fm[key] = "";
			continue;
		}

		const lower = rawValue.toLowerCase();
		if (lower === "true") {
			fm[key] = true;
			continue;
		}
		if (lower === "false") {
			fm[key] = false;
			continue;
		}

		// Numbers (int/float) are enough for our config.
		if (/^[+-]?\d+(?:\.\d+)?$/.test(rawValue)) {
			const n = Number(rawValue);
			fm[key] = Number.isFinite(n) ? n : rawValue;
			continue;
		}

		// Strip basic single/double quotes.
		if (
			(rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) ||
			(rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)
		) {
			fm[key] = rawValue.slice(1, -1);
			continue;
		}

		fm[key] = rawValue;
	}

	return fm;
}

export async function isJournalFeedAnchorFileMaybeRead(plugin: BlockLinkPlus, file: TFile): Promise<boolean> {
	const ext = String((file as any)?.extension ?? "").toLowerCase();
	const path = String((file as any)?.path ?? "");
	if ((ext && ext !== "md") || (!ext && !path.toLowerCase().endsWith(".md"))) return false;

	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter as Record<string, unknown> | undefined;
	if (fm) {
		if (!Object.prototype.hasOwnProperty.call(fm, JOURNAL_FEED_FRONTMATTER_KEY)) return false;
		return parseFrontmatterBool(fm[JOURNAL_FEED_FRONTMATTER_KEY]);
	}

	// Fallback: metadata cache may lag behind vault.modify() or large vault indexing.
	try {
		const text = await plugin.app.vault.cachedRead(file);
		const parsed = parseFrontmatterFromText(text);
		if (!parsed) return false;
		if (!Object.prototype.hasOwnProperty.call(parsed, JOURNAL_FEED_FRONTMATTER_KEY)) return false;
		return parseFrontmatterBool(parsed[JOURNAL_FEED_FRONTMATTER_KEY]);
	} catch {
		return false;
	}
}

export type JournalFeedConfig = {
	initialDays: number;
	pageSize: number;
};

const DEFAULT_INITIAL_DAYS = 3;
const DEFAULT_PAGE_SIZE = 7;

function parsePositiveInt(raw: unknown, fallback: number): number {
	const n = typeof raw === "number" ? raw : Number(String(raw ?? ""));
	if (!Number.isFinite(n)) return fallback;
	const i = Math.floor(n);
	return i > 0 ? i : fallback;
}

export function getJournalFeedConfigFromAnchor(plugin: BlockLinkPlus, file: TFile | null): JournalFeedConfig {
	const fm = file ? ((plugin.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined) ?? undefined) : undefined;
	const initialDays = parsePositiveInt(fm?.blp_journal_initial_days, DEFAULT_INITIAL_DAYS);
	const pageSize = parsePositiveInt(fm?.blp_journal_page_size, DEFAULT_PAGE_SIZE);
	return { initialDays, pageSize };
}

export function getJournalFeedConfigFromText(text: string | null | undefined): JournalFeedConfig {
	const fm = text ? parseFrontmatterFromText(String(text)) : null;
	const initialDays = parsePositiveInt(fm?.blp_journal_initial_days, DEFAULT_INITIAL_DAYS);
	const pageSize = parsePositiveInt(fm?.blp_journal_page_size, DEFAULT_PAGE_SIZE);
	return { initialDays, pageSize };
}
