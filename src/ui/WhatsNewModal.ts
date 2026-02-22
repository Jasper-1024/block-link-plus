import { App, Modal } from "obsidian";
import i18n from "shared/i18n";
import { getChangelogUrl, ObsidianLanguage } from "features/whats-new";

const WHATS_NEW_V2: Record<ObsidianLanguage, string[]> = {
	en: [
		"Outliner is now the main workflow (Logseq-like list blocks in scoped files).",
		"Unified scope model: enable via settings (folders/files) or per-file frontmatter `blp_outliner: true/false`.",
		"`blp-view` is aligned with the Outliner scope model (no cross-scope reads).",
		"Removed legacy Timeline / Time Section features.",
	],
	zh: [
		"Outliner 成为主线工作流（仿 Logseq：在启用范围内把列表项当作 block）。",
		"启用范围统一：设置中的启用文件夹/文件 + 每文件 frontmatter `blp_outliner: true/false`。",
		"`blp-view` 与 Outliner 启用范围对齐（不会再跨范围读取）。",
		"移除 Timeline / Time section 等旧能力。",
	],
	"zh-TW": [
		"Outliner 成為主線工作流（仿 Logseq：在啟用範圍內把清單項當作 block）。",
		"啟用範圍統一：設定中的啟用資料夾/檔案 + 每檔案 frontmatter `blp_outliner: true/false`。",
		"`blp-view` 與 Outliner 啟用範圍對齊（不再跨範圍讀取）。",
		"移除 Timeline / Time section 等舊能力。",
	],
};

const WHATS_NEW_V2_0_1: Record<ObsidianLanguage, string[]> = {
	en: [
		"Outliner: editor command bridge enabled (core shortcuts like Ctrl+B now work in Outliner edit mode).",
		"Outliner: strict plugin allowlist for editor commands (enable specific shortcut plugins safely).",
		"Settings: one-click copy from the editor menu allowlist to the editor command allowlist.",
	],
	zh: [
		"Outliner：编辑器命令桥接（Outliner 编辑时 core 快捷键如 Ctrl+B 可用）。",
		"Outliner：编辑器命令严格白名单（可安全启用部分快捷键插件）。",
		"设置：支持从编辑器右键菜单白名单一键复制到编辑器命令白名单。",
	],
	"zh-TW": [
		"Outliner：編輯器命令橋接（Outliner 編輯時 core 快捷鍵如 Ctrl+B 可用）。",
		"Outliner：編輯器命令嚴格白名單（可安全啟用部分快捷鍵外掛）。",
		"設定：支援從編輯器右鍵選單白名單一鍵複製到編輯器命令白名單。",
	],
};

const WHATS_NEW_V2_0_2: Record<ObsidianLanguage, string[]> = {
	en: [
		"Outliner: display-mode embed preview (`![[...]]`) now renders closer to the inline editor (spacing/indent; avoid clipped list markers).",
	],
	zh: ["Outliner：展示态嵌入预览（`![[...]]`）渲染更接近内联编辑（行距/缩进；避免列表 marker 被裁切）。"],
	"zh-TW": ["Outliner：顯示態內嵌預覽（`![[...]]`）渲染更接近內嵌編輯（行距/縮排；避免清單 marker 被裁切）。"],
};

export class WhatsNewModal extends Modal {
	private readonly currentVersion: string;
	private readonly previousVersion: string;

	constructor(app: App, options: { currentVersion: string; previousVersion: string }) {
		super(app);
		this.currentVersion = options.currentVersion;
		this.previousVersion = options.previousVersion;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const title = i18n.whatsNew.titleWithVersion.replace("${1}", this.currentVersion);
		contentEl.createEl("h2", { text: title });

		if (this.previousVersion) {
			const summary = i18n.whatsNew.updatedFromTo
				.replace("${1}", this.previousVersion)
				.replace("${2}", this.currentVersion);
			contentEl.createEl("p", { text: summary });
		}

		const items = this.getWhatsNewItems();

		if (items.length) {
			const listEl = contentEl.createEl("ul");
			for (const item of items) {
				listEl.createEl("li", { text: item });
			}
		}

		const buttonsEl = contentEl.createDiv({ cls: "modal-button-container" });

		const changelogBtn = buttonsEl.createEl("button", {
			text: i18n.whatsNew.viewChangelog,
			cls: "mod-cta",
		});
		changelogBtn.addEventListener("click", () => {
			const url = getChangelogUrl(i18n.lang);
			window.open(url);
		});

		const closeBtn = buttonsEl.createEl("button", { text: i18n.whatsNew.close });
		closeBtn.addEventListener("click", () => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}

	private getWhatsNewItems(): string[] {
		if (this.currentVersion === "1.8.0") {
			return i18n.whatsNew.v1_8_0;
		}

		if (this.currentVersion === "2.0.2") {
			return WHATS_NEW_V2_0_2[i18n.lang] ?? WHATS_NEW_V2_0_2.en;
		}

		if (this.currentVersion === "2.0.1") {
			return WHATS_NEW_V2_0_1[i18n.lang] ?? WHATS_NEW_V2_0_1.en;
		}

		if (this.currentVersion === "2.0.0" || this.currentVersion.startsWith("2.0.")) {
			return WHATS_NEW_V2[i18n.lang] ?? WHATS_NEW_V2.en;
		}

		return i18n.whatsNew.fallback;
	}
}
