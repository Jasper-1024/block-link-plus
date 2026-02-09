import { DateTime } from "luxon";

import { MARKDOWN_TAB_WIDTH, normalizeLineLeadingIndentTabsToSpaces } from "../../shared/markdown/indent-utils";
import { buildFenceStateMapFromLines, LIST_ITEM_PREFIX_RE } from "../../shared/markdown/list-parse";
import { generateRandomId } from "../../utils";

export const OUTLINER_PROTOCOL_VERSION = 2;
export const OUTLINER_SYSTEM_MARKER_KEY = "blp_sys";
export const OUTLINER_SYSTEM_MARKER_VALUE = "1";
export const OUTLINER_SYSTEM_VERSION_KEY = "blp_ver";
export const OUTLINER_SYSTEM_DATE_KEY = "date";
export const OUTLINER_SYSTEM_UPDATED_KEY = "updated";

export type OutlinerNormalizeOptions = {
	idPrefix: string;
	idLength: number;
	/** Optional deterministic id generator (tests) */
	generateId?: (prefix: string, length: number) => string;
	indentSize?: number; // default: 2
	now?: DateTime; // test hook
};

export type OutlinerSystemFields = {
	date: string;
	updated: string;
	/** User / plugin-defined Dataview inline fields preserved on the tail line. */
	extra: Record<string, string>;
};

export type OutlinerBlock = {
	id: string;
	depth: number;
	// Editable markdown text for the block (first line + continuation lines).
	text: string;
	children: OutlinerBlock[];
	system: OutlinerSystemFields;
	// Internal: helps choose between multiple competing system line candidates.
	_systemHasBlpMarker?: boolean;
};

export type ParsedOutlinerFile = {
	frontmatter: string | null;
	blocks: OutlinerBlock[];
};

function normalizeNewlines(input: string): string {
	return String(input ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function splitFrontmatter(input: string): { frontmatter: string | null; body: string } {
	const text = normalizeNewlines(input);
	const lines = text.split("\n");
	if ((lines[0] ?? "").trim() !== "---") return { frontmatter: null, body: text };

	for (let i = 1; i < lines.length; i++) {
		if ((lines[i] ?? "").trim() === "---") {
			const fm = lines.slice(0, i + 1).join("\n");
			const body = lines.slice(i + 1).join("\n");
			return { frontmatter: fm, body };
		}
	}

	// No closing fence: treat as normal markdown.
	return { frontmatter: null, body: text };
}

function formatSystemDate(dt: DateTime): string {
	return dt.toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

function indentText(depth: number, indentSize: number): string {
	return " ".repeat(Math.max(0, depth) * indentSize);
}

function contentIndentText(depth: number, indentSize: number): string {
	return indentText(depth, indentSize) + " ".repeat(indentSize);
}

type ParsedSystemLine = {
	id: string;
	fields: Record<string, string>;
};

const RESERVED_SYSTEM_KEYS = new Set<string>([
	OUTLINER_SYSTEM_DATE_KEY,
	OUTLINER_SYSTEM_UPDATED_KEY,
	OUTLINER_SYSTEM_MARKER_KEY,
	OUTLINER_SYSTEM_VERSION_KEY,
]);

function parseDataviewInlineFields(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	const re = /\[([^\[\]:]+?)::\s*([^\]]*?)\]/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const key = String(m[1] ?? "").trim();
		if (!key) continue;
		const value = String(m[2] ?? "").trim();
		out[key] = value;
	}
	return out;
}

function stripInlineFields(text: string): string {
	return text.replace(/\[[^\[\]]+?::[^\]]*?\]/g, "").trim();
}

function parseSystemLineCandidate(rawLine: string): ParsedSystemLine | null {
	// Must end with ^id (allowing trailing whitespace so we can repair it).
	const m = rawLine.match(/\^([a-zA-Z0-9_-]+)\s*$/);
	if (!m?.[1]) return null;

	const id = m[1];
	const beforeCaret = rawLine.slice(0, m.index ?? rawLine.length);

	// Ensure there is no other non-field text; keep this strict so we don't
	// accidentally eat user content.
	const residue = stripInlineFields(beforeCaret);
	if (residue.length !== 0) return null;

	return {
		id,
		fields: parseDataviewInlineFields(beforeCaret),
	};
}

function extractExtraSystemFields(fields: Record<string, string>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(fields)) {
		if (!key) continue;
		if (RESERVED_SYSTEM_KEYS.has(key)) continue;
		out[key] = value;
	}
	return out;
}

function normalizeSystemFields(fields: Record<string, string>, now: DateTime): OutlinerSystemFields {
	const date = fields[OUTLINER_SYSTEM_DATE_KEY] || formatSystemDate(now);
	// Default updated to "now" if missing.
	const updated = fields[OUTLINER_SYSTEM_UPDATED_KEY] || formatSystemDate(now);
	return { date, updated, extra: extractExtraSystemFields(fields) };
}

function mergeSplitSystemLines(lines: string[], fenceMap: boolean[]): string[] {
	// Merge `[date:: ...]` + `^id` pairs (legacy) into a single line so we can normalize
	// everything through the same system-line parser.
	const out: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		const line = lines[i] ?? "";
		if (fenceMap[lineNo]) {
			out.push(line);
			continue;
		}

		const dateOnly = line.match(/^(\s*)\[date::\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\]\s*$/);
		if (!dateOnly) {
			out.push(line);
			continue;
		}

		const next = lines[i + 1] ?? "";
		const idOnly = next.match(/^(\s*)\^([a-zA-Z0-9_-]+)\s*$/);
		if (!idOnly) {
			out.push(line);
			continue;
		}

		const dateIndent = dateOnly[1] ?? "";
		const idIndent = idOnly[1] ?? "";
		if (dateIndent !== idIndent) {
			out.push(line);
			continue;
		}

		out.push(`${dateIndent}[date:: ${dateOnly[2]}] ^${idOnly[2]}`);
		i++; // consume id line
	}

	return out;
}

function parseBodyToBlocks(body: string, opts: { indentSize: number; now: DateTime }): OutlinerBlock[] {
	const normalized = normalizeNewlines(body);
	const rawLines = normalized.split("\n").map((l) => normalizeLineLeadingIndentTabsToSpaces(l, MARKDOWN_TAB_WIDTH));
	const fenceMap0 = buildFenceStateMapFromLines(rawLines);
	const mergedLines = mergeSplitSystemLines(rawLines, fenceMap0);
	const fenceMap = buildFenceStateMapFromLines(mergedLines);

	const blocks: OutlinerBlock[] = [];
	const stack: Array<{ block: OutlinerBlock; depth: number; contentIndent: number }> = [];

	const indentSize = opts.indentSize;
	const now = opts.now;

	// Outliner MUST treat task checkboxes (`[ ]`, `[x]`) as plain text.
	// Therefore the outliner list-item prefix MUST NOT consume the checkbox.
	const OUTLINER_LIST_ITEM_PREFIX_RE = /^(\s*)(?:([-*+])|(\d+\.))\s+/;

	for (let i = 0; i < mergedLines.length; i++) {
		const lineNo = i + 1;
		const line = mergedLines[i] ?? "";
		const inFence = fenceMap[lineNo] ?? false;

		// Fence contents are opaque for structural parsing, BUT a fence may start on the
		// list-item line itself (`- ```lang`). In that case we MUST still parse the list
		// item boundary, otherwise we'd drop the opening fence line and corrupt the tree.
		const prevInFence = fenceMap[Math.max(0, lineNo - 1)] ?? false;
		const allowStructure = !inFence || (inFence && !prevInFence);

		if (allowStructure) {
			const listMatch = line.match(OUTLINER_LIST_ITEM_PREFIX_RE);
			if (listMatch) {
				const indent = (listMatch[1] ?? "").length;
				const depth = Math.max(0, Math.floor(indent / indentSize));
				const content = line.slice((listMatch[0] ?? "").length);

				while (stack.length > depth) stack.pop();

				const block: OutlinerBlock = {
					id: "",
					depth,
					text: content,
					children: [],
					system: { date: "", updated: "", extra: {} },
					_systemHasBlpMarker: false,
				};

				if (depth === 0) {
					blocks.push(block);
				} else {
					const parent = stack[depth - 1]?.block;
					if (parent) parent.children.push(block);
					else blocks.push(block);
				}

				stack.push({ block, depth, contentIndent: depth * indentSize + indentSize });
				continue;
			}

			const sys = parseSystemLineCandidate(line);
			if (sys) {
				// Assign to the deepest open block whose content indent <= this line indent.
				const lineIndent = (line.match(/^\s*/)?.[0] ?? "").length;
				let owner: { block: OutlinerBlock; depth: number; contentIndent: number } | null = null;
				for (let j = stack.length - 1; j >= 0; j--) {
					const cand = stack[j];
					if (lineIndent >= cand.contentIndent) {
						owner = cand;
						break;
					}
				}

				if (owner) {
					// Strip a single trailing spacer line (canonical uses it).
					const textLines = owner.block.text.split("\n");
					if (textLines.length > 0 && textLines[textLines.length - 1] === "") {
						owner.block.text = textLines.slice(0, -1).join("\n");
					}

					// Prefer BLP-marked system lines if multiple exist; otherwise keep the first.
					const nextHasMarker = (sys.fields[OUTLINER_SYSTEM_MARKER_KEY] ?? "") === OUTLINER_SYSTEM_MARKER_VALUE;
					const shouldReplace = !owner.block.id || (!owner.block._systemHasBlpMarker && nextHasMarker);

					// Preserve arbitrary Dataview fields that live on system lines, even if we end up
					// choosing a different system line candidate for the id/date fields.
					const extra = extractExtraSystemFields(sys.fields);
					for (const [k, v] of Object.entries(extra)) {
						if (shouldReplace || owner.block.system.extra[k] === undefined) {
							owner.block.system.extra[k] = v;
						}
					}

					if (shouldReplace) {
						owner.block.id = sys.id;
						owner.block.system = normalizeSystemFields(sys.fields, now);
						owner.block._systemHasBlpMarker = nextHasMarker;
					} else {
						// Fill missing reserved fields without overriding the chosen system line.
						if (!owner.block.system.date && sys.fields[OUTLINER_SYSTEM_DATE_KEY]) {
							owner.block.system.date = sys.fields[OUTLINER_SYSTEM_DATE_KEY];
						}
						if (!owner.block.system.updated && sys.fields[OUTLINER_SYSTEM_UPDATED_KEY]) {
							owner.block.system.updated = sys.fields[OUTLINER_SYSTEM_UPDATED_KEY];
						}
					}
				}

				// Always drop system line candidates from body text.
				continue;
			}
		}

		// Content line (body / fence lines / blank lines). Assign to deepest matching block.
		const lineIndent = (line.match(/^\s*/)?.[0] ?? "").length;
		let owner: { block: OutlinerBlock; depth: number; contentIndent: number } | null = null;
		for (let j = stack.length - 1; j >= 0; j--) {
			const cand = stack[j];
			if (lineIndent >= cand.contentIndent) {
				owner = cand;
				break;
			}
		}

		if (!owner) {
			// Outside list-only content: ignore (normalization will drop).
			continue;
		}

		const stripped = line.trim().length === 0 ? "" : line.slice(Math.min(line.length, owner.contentIndent));
		owner.block.text = owner.block.text.length ? `${owner.block.text}\n${stripped}` : stripped;
	}

	return blocks;
}

function collectIds(blocks: OutlinerBlock[], out: string[] = []): string[] {
	for (const b of blocks) {
		if (b.id) out.push(b.id);
		collectIds(b.children, out);
	}
	return out;
}

function ensureUniqueIds(blocks: OutlinerBlock[], opts: OutlinerNormalizeOptions): void {
	const reserved = new Set<string>(collectIds(blocks).filter(Boolean));
	const used = new Set<string>();
	const idGenerator = opts.generateId ?? generateRandomId;

	const gen = () => {
		// Extremely unlikely fallback: keep trying with a longer suffix.
		const baseLen = Math.max(3, Math.min(7, Math.floor(opts.idLength)));
		for (let tries = 0; tries < 50; tries++) {
			const id = idGenerator(opts.idPrefix, baseLen);
			if (!reserved.has(id) && !used.has(id)) return id;
		}
		for (let tries = 0; tries < 50; tries++) {
			const id = Math.random().toString(36).slice(2, 10);
			if (!reserved.has(id) && !used.has(id)) return id;
		}
		return generateRandomId(opts.idPrefix, Math.min(7, baseLen));
	};

	const walk = (list: OutlinerBlock[]) => {
		for (const b of list) {
			if (!b.id || used.has(b.id)) {
				let next = gen();
				used.add(next);
				b.id = next;
			} else {
				used.add(b.id);
			}
			walk(b.children);
		}
	};

	walk(blocks);
}

function normalizeSystemMarkers(blocks: OutlinerBlock[], opts: OutlinerNormalizeOptions): void {
	const now = opts.now ?? DateTime.now();
	const walk = (list: OutlinerBlock[]) => {
		for (const b of list) {
			if (!b.system.date) b.system.date = formatSystemDate(now);
			if (!b.system.updated) b.system.updated = formatSystemDate(now);
			if (!b.system.extra) b.system.extra = {};
			walk(b.children);
		}
	};
	walk(blocks);
}

function escapeBodyLineIfNeeded(line: string, inFence: boolean): string {
	if (inFence) return line;
	// Prevent accidental structure changes: a body line that looks like a list item
	// at the content indent should stay text unless created via structural ops.
	if (LIST_ITEM_PREFIX_RE.test(line)) {
		// Escape unordered markers (`-`, `*`, `+`) and ordered markers (`1.`).
		if (/^[-*+]\s+/.test(line)) return `\\${line}`;
		const m = line.match(/^(\d+)\.\s+/);
		if (m) return line.replace(/^(\d+)\./, "$1\\.");
	}
	return line;
}

function serializeBlocks(blocks: OutlinerBlock[], opts: { indentSize: number }): string[] {
	const out: string[] = [];
	const indentSize = opts.indentSize;

	const walk = (list: OutlinerBlock[], depth: number) => {
		for (const b of list) {
			const indent = indentText(depth, indentSize);
			const bodyIndent = contentIndentText(depth, indentSize);

			const rawLines = String(b.text ?? "").split("\n");
			const first = rawLines[0] ?? "";
			out.push(`${indent}- ${first}`);

			const fenceMap = buildFenceStateMapFromLines(rawLines);
			for (let i = 1; i < rawLines.length; i++) {
				const raw = rawLines[i] ?? "";
				const inFence = fenceMap[i + 1] ?? false;
				out.push(raw.length === 0 ? bodyIndent : `${bodyIndent}${escapeBodyLineIfNeeded(raw, inFence)}`);
			}

			walk(b.children, depth + 1);

			// Spacer line is only needed when the block has children: without it, Obsidian-native
			// embeds (`![[file#^id]]`) may attach the id to the last child instead of the parent.
			if (b.children.length > 0) {
				out.push(bodyIndent);
			}

			const extraKeys = Object.keys(b.system.extra ?? {}).sort();
			const extraFields = extraKeys.map((k) => `[${k}:: ${b.system.extra[k]}]`);

			const tailFields = [
				`[${OUTLINER_SYSTEM_DATE_KEY}:: ${b.system.date}]`,
				`[${OUTLINER_SYSTEM_UPDATED_KEY}:: ${b.system.updated}]`,
				`[${OUTLINER_SYSTEM_MARKER_KEY}:: ${OUTLINER_SYSTEM_MARKER_VALUE}]`,
				`[${OUTLINER_SYSTEM_VERSION_KEY}:: ${OUTLINER_PROTOCOL_VERSION}]`,
				...extraFields,
			].join(" ");

			out.push(`${bodyIndent}${tailFields} ^${b.id}`.trimEnd());
		}
	};

	walk(blocks, 0);
	return out;
}

export function serializeOutlinerBlocksForClipboard(
	blocks: OutlinerBlock[],
	opts: { indentSize: number }
): string {
	const out: string[] = [];
	const indentSize = opts.indentSize;

	const walk = (list: OutlinerBlock[], depth: number) => {
		for (const b of list) {
			const indent = indentText(depth, indentSize);
			const bodyIndent = contentIndentText(depth, indentSize);

			const rawLines = String(b.text ?? "").split("\n");
			const first = rawLines[0] ?? "";
			out.push(`${indent}- ${first}`);

			const fenceMap = buildFenceStateMapFromLines(rawLines);
			for (let i = 1; i < rawLines.length; i++) {
				const raw = rawLines[i] ?? "";
				const inFence = fenceMap[i + 1] ?? false;
				out.push(raw.length === 0 ? bodyIndent : `${bodyIndent}${escapeBodyLineIfNeeded(raw, inFence)}`);
			}

			walk(b.children, depth + 1);
		}
	};

	walk(blocks, 0);
	return out.join("\n").trimEnd();
}

export function parseOutlinerFile(input: string, opts: { indentSize: number; now: DateTime }): ParsedOutlinerFile {
	const src = normalizeNewlines(input);
	const { frontmatter, body } = splitFrontmatter(src);
	const blocks = parseBodyToBlocks(body, opts);
	return { frontmatter, blocks };
}

export function serializeOutlinerFile(file: ParsedOutlinerFile, opts: { indentSize: number }): string {
	const bodyLines = serializeBlocks(file.blocks ?? [], opts);
	const nextBody = bodyLines.join("\n") + "\n";
	return file.frontmatter ? `${file.frontmatter}\n${nextBody}` : nextBody;
}

export function normalizeOutlinerFile(
	input: string,
	opts: OutlinerNormalizeOptions
): { file: ParsedOutlinerFile; content: string; didChange: boolean } {
	const indentSize = Math.max(1, Math.floor(opts.indentSize ?? 2));
	const now = opts.now ?? DateTime.now();
	const src = normalizeNewlines(input);

	const file = parseOutlinerFile(src, { indentSize, now });
	ensureUniqueIds(file.blocks, opts);
	normalizeSystemMarkers(file.blocks, { ...opts, indentSize, now });

	const content = serializeOutlinerFile(file, { indentSize });
	const didChange = normalizeNewlines(content) !== normalizeNewlines(src.endsWith("\n") ? src : src + "\n");
	return { file, content, didChange };
}
