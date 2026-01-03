import { isTimeSection } from "../utils";

export function markdownPostProcessor(el: HTMLElement, plugin: any) {
	// Process time section headings if enabled
	if (plugin.settings.time_section_plain_style) {
		const headings = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
		headings.forEach((heading) => {
			if (
				heading.textContent &&
				isTimeSection(heading.textContent.trim(), plugin.settings.time_section_title_pattern)
			) {
				// Add a special class to style time sections as plain text
				heading.classList.add("time-section-plain");
			}
		});
	}
}
