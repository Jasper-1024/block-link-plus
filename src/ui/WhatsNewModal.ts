import { App, Modal } from "obsidian";
import i18n from "shared/i18n";
import { getChangelogUrl } from "features/whats-new";

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

		const items =
			this.currentVersion === "1.8.0" ? i18n.whatsNew.v1_8_0 : i18n.whatsNew.fallback;

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
}

