import { syncRangeEmbedWrapperPadding } from "../InlineEditEngine";

describe("syncRangeEmbedWrapperPadding", () => {
	test("copies native embed preview padding onto the range wrapper", () => {
		const embedEl = document.createElement("div");
		embedEl.innerHTML = `
			<div class="markdown-embed-content">
				<div class="markdown-preview-view" style="padding-left: 24px; padding-right: 4px;"></div>
			</div>
		`;

		const wrapper = document.createElement("div");
		syncRangeEmbedWrapperPadding(embedEl, wrapper);

		expect(wrapper.style.paddingLeft).toBe("24px");
		expect(wrapper.style.paddingRight).toBe("4px");
	});

	test("does nothing when the native embed preview is missing", () => {
		const embedEl = document.createElement("div");
		const wrapper = document.createElement("div");
		wrapper.style.paddingLeft = "10px";

		syncRangeEmbedWrapperPadding(embedEl, wrapper);

		expect(wrapper.style.paddingLeft).toBe("10px");
	});
});
