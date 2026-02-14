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

		if (this.currentVersion === "2.0.0" || this.currentVersion.startsWith("2.0.")) {
			return WHATS_NEW_V2[i18n.lang] ?? WHATS_NEW_V2.en;
		}

		return i18n.whatsNew.fallback;
	}
}
