import { markdownPostProcessor } from "../MarkdownPost";

describe("markdownPostProcessor", () => {
	test("does not remove rendered text content", () => {
		const el = document.createElement("div");
		el.innerHTML = "<p>Hello world 123</p><p>Second line</p>";

		const plugin = {
			settings: {
				time_section_plain_style: false,
				time_section_title_pattern: "\\\\d{1,2}:\\\\d{1,2}",
			},
		} as any;

		markdownPostProcessor(el, plugin);

		expect(el.textContent).toContain("Hello world 123");
		expect(el.textContent).toContain("Second line");
	});
});

