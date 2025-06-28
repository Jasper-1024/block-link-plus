import { isTimeSection } from "../utils";

export function markdownPostProcessor(el: HTMLElement, plugin: any) {
    if (!el.firstChild) return;

    // Process text nodes to handle special markers
    if (el.firstChild instanceof Node) {
        let walker = document.createTreeWalker(
            el.firstChild,
            NodeFilter.SHOW_TEXT,
            null
        );
        let nodes: Node[] = [];
        let node: Node;
        // @ts-ignore
        while ((node = walker.nextNode())) {
            nodes.push(node);
        }

        for (node of nodes) {
            // @ts-ignore
            node.textContent = node.textContent.replace(
                /\s*˅[a-zA-Z0-9-]*/g,
                ""
            );
        }
    }

    // Process time section headings if enabled
    if (plugin.settings.time_section_plain_style) {
        const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            if (heading.textContent && isTimeSection(heading.textContent.trim(), plugin.settings.time_section_title_pattern)) {
                // Add a special class to style time sections as plain text
                heading.classList.add('time-section-plain');
            }
        });
    }
}
