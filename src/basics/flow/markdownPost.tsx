import { EditorView } from "@codemirror/view";
import { FlowEditorHover } from "basics/flow/FlowEditorHover";
import { UINote } from "basics/ui/UINote";
import BlockLinkPlus from "main";
import { App, MarkdownPostProcessorContext } from "obsidian";
import React from "react";
import { createRoot } from "react-dom/client";

const getCMFromElement = (
  el: HTMLElement,
  app: App
): EditorView | undefined => {
  let dom: HTMLElement = el;
  while (!dom.hasClass("cm-editor") && dom.parentElement) {
    dom = dom.parentElement;
  }

  if (!dom.hasClass("cm-editor")) {
    return;
  }
  let rcm: EditorView | undefined;
  app.workspace.iterateLeaves((leaf) => {
    //@ts-ignore
    const cm = leaf.view.editor?.cm as EditorView;
    if (cm && dom == cm.dom) {
      rcm = cm;
      return true;
    }
  }, app.workspace["rootSplit"]!);
  return rcm;
};

export const replaceAllTables = (
  plugin: BlockLinkPlus,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext
) => {
  el.querySelectorAll("p").forEach((element) => {
    if (!element.textContent || !element.parentElement) return;
    for (const match of element.textContent.matchAll(
      /!!\[\[([^\]]+)\]\]/g
    )) {
      const link = match[1];
      element.style.display = "none";
      const reactEl = createRoot(element.parentElement);
      //   const flowType = cm.state.field(flowTypeStateField, false);
      reactEl.render(
        <UINote
          load={true}
          plugin={plugin}
          path={link}
          source={ctx.sourcePath}
        ></UINote>
      );
    }
  });
};
export const replaceMarkdownForEmbeds = (
  el: HTMLElement,
  callback: (dom: HTMLElement) => void
) => {
  let dom: HTMLElement = el;

  // For Reading mode, we need to handle the case where the element
  // might be the actual embed element or its child
  if (el.classList.contains('internal-embed') && el.classList.contains('markdown-embed')) {
    callback(el);
    return;
  }

  setTimeout(async () => {
    //wait for el to be attached to the displayed document
    let counter = 0;
    while (!el.parentElement && counter++ <= 50) await sleep(50);
    if (!el.parentElement) return;
    while (!dom.hasClass("markdown-embed") && dom.parentElement) {
      dom = dom.parentElement;
    }
    if (dom && dom.hasClass("markdown-embed")) {
      callback(dom);
    }
  });
};

export const waitDOMInCM = (
  el: HTMLElement,
  cm: EditorView,
  callback: (dom: HTMLElement) => void
) => {
  let dom: HTMLElement = el;
  setTimeout(async () => {
    //wait for el to be attached to the displayed document
    let counter = 0;
    while (!el.parentElement && counter++ <= 50) await sleep(50);
    if (!el.parentElement) return;

    while (!dom.hasClass("markdown-embed") && dom.parentElement) {
      dom = dom.parentElement;
    }
    if (dom) {
      callback(dom);
    }
  });
};

export const replaceAllEmbed = (
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App
) => {
  replaceMarkdownForEmbeds(el, async (dom) => {
    // Check if this is a multi-line block embed
    const embedLink = dom.getAttribute('src');
    if (embedLink) {
      const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
      if (multiLineBlockRegex.test(embedLink)) {
        // Skip processing for multi-line block embeds
        return;
      }
    }

    const nodes = dom.querySelectorAll(".markdown-embed-link");

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode === dom) {
        const toolbar = dom.createDiv("blp-embed-toolbar");
        toolbar.prepend(nodes[i]);
        const div = toolbar.createDiv("mk-floweditor-selector");
        const reactEl = createRoot(div);
        const cm: EditorView | undefined = getCMFromElement(dom, app);
        if (cm) {
          if (!dom.parentElement) return;
          const pos = cm.posAtDOM(dom);
          const index = [
            ...Array.from(dom.parentElement.childNodes),
          ].indexOf(dom);
          if (index == -1) return;
          const nextDom = dom.parentElement.childNodes[index];
          const endPos = cm.posAtDOM(nextDom as HTMLElement);
          if (ctx.sourcePath && pos !== null && endPos !== null) {
            reactEl.render(
              <FlowEditorHover
                app={app}
                toggle={true}
                path={ctx.sourcePath}
                toggleState={false}
                view={cm}
                pos={{ from: pos + 3, to: endPos - 3 }}
                plugin={plugin}
                dom={dom}
              ></FlowEditorHover>
            );
          }
        }
      }
    }
  });
};

export const replaceMultilineBlocks = (
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App,
  showEditIcon: boolean = false
) => {
  // Handle the case where the element is directly the embed in Reading mode
  if (el.classList.contains('internal-embed') && el.classList.contains('markdown-embed')) {
    processMultilineEmbed(el, ctx, plugin, app, showEditIcon);
    return;
  }

  replaceMarkdownForEmbeds(el, async (dom) => {
    processMultilineEmbed(dom, ctx, plugin, app, showEditIcon);
  });
};

function processMultilineEmbed(
  dom: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App,
  showEditIcon: boolean
) {
  // Check if this is a multi-line block embed
  let embedLink = dom.getAttribute('src');
  const altText = dom.getAttribute('alt');

  // If src is null, try to recover from alt attribute
  if (!embedLink && altText) {
    // Extract src from alt text (format: "filename > ^id")
    const match = altText.match(/(.+?)\s*>\s*(.+)/);
    if (match) {
      embedLink = match[1].trim() + '#' + match[2].trim();
      // Set the src attribute for future reference
      dom.setAttribute('src', embedLink);
    }
  }

  // Try to get from data attributes as fallback
  if (!embedLink) {
    const dataHref = dom.getAttribute('data-href');
    if (dataHref) {
      embedLink = dataHref;
    }
  }

  // Try to extract from aria-label
  if (!embedLink) {
    const ariaLabel = dom.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.includes('#^')) {
      embedLink = ariaLabel;
    }
  }

  // Try to find link info in child elements
  if (!embedLink) {
    const linkEl = dom.querySelector('.markdown-embed-link');
    if (linkEl) {
      const href = linkEl.getAttribute('href');
      const ariaLabel = linkEl.getAttribute('aria-label');
      if (href) {
        embedLink = href;
      } else if (ariaLabel) {
        embedLink = ariaLabel;
      }
    }
  }

  // Last resort: check the content div for clues
  if (!embedLink) {
    const contentDiv = dom.querySelector('.markdown-embed-content');
    if (contentDiv) {
      const firstChild = contentDiv.firstElementChild;
      if (firstChild) {
        const id = firstChild.getAttribute('id');
        if (id) {
          // Try to reconstruct the link from the ID
          if (id.match(/\^[a-z0-9]+-[a-z0-9]+/)) {
            embedLink = ctx.sourcePath + '#' + id;
          }
        }
      }
    }
  }

  if (!embedLink) {
    return;
  }

  const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
  if (!multiLineBlockRegex.test(embedLink)) {
    // Not a multi-line block, skip
    return;
  }

  // Check if already processed by CodeMirror decorator
  if (dom.querySelector('.mk-flowspace-editor')) {
    // Already processed, skip
    return;
  }

  // Check if we have an existing container
  const existingContainer = dom.querySelector('.mk-multiline-block-container');
  if (existingContainer) {

    // Check if container has the actual content (not just empty structure)
    const hasFlowEditor = existingContainer.querySelector('.mk-flowspace-editor');
    const hasContent = hasFlowEditor && hasFlowEditor.querySelector('.mk-floweditor');

    if (hasContent) {
      return;
    } else {
      // Remove the empty container to allow re-creation
      existingContainer.remove();
    }
  }
  // Hide the native rendering
  const nativeContent = dom.querySelector('.markdown-embed-content');
  if (nativeContent) {
    (nativeContent as HTMLElement).style.display = 'none';
  }

  // Handle the native link icon
  const nativeLink = dom.querySelector('.markdown-embed-link');

  // Create container for our custom rendering
  const container = dom.createDiv('mk-multiline-block-container');

  // Add click handler for Live Preview mode to trigger link editing
  if (showEditIcon) {

    container.addEventListener('click', (e) => {
      e.stopPropagation();

      const cm: EditorView | undefined = getCMFromElement(dom, app);
      if (cm) {
        // Calculate the document position for the multiline block
        const pos = cm.posAtDOM(dom);
        if (pos !== null) {
          // Set cursor to the beginning of the link text
          const linkStart = pos + 3; // Skip "![[" 
          const linkEnd = pos + 3 + embedLink.length; // End of the link


          // Set selection to the link range to trigger Obsidian's native link editing
          cm.dispatch({
            selection: { anchor: linkStart, head: linkEnd },
            scrollIntoView: true
          });

          // Focus the editor to ensure the selection is visible
          cm.focus();
        }
      }
    });

    // Create edit icon if in Live Preview mode
    if (nativeLink) {
      // Hide the native link
      (nativeLink as HTMLElement).style.display = 'none';

      // Create toolbar similar to replaceAllEmbed
      const toolbar = dom.createDiv("blp-embed-toolbar");
      toolbar.prepend(nativeLink.cloneNode(true)); // Clone the native link
      const div = toolbar.createDiv("mk-floweditor-selector");
      const reactEl = createRoot(div);

      const cm: EditorView | undefined = getCMFromElement(dom, app);
      if (cm) {
        if (!dom.parentElement) return;
        const pos = cm.posAtDOM(dom);
        const index = [...Array.from(dom.parentElement.childNodes)].indexOf(dom);
        if (index == -1) return;
        const nextDom = dom.parentElement.childNodes[index + 1] || dom.parentElement.childNodes[index];
        const endPos = cm.posAtDOM(nextDom as HTMLElement);

        if (ctx.sourcePath && pos !== null && endPos !== null) {
          reactEl.render(
            <FlowEditorHover
              app={app}
              toggle={true}
              path={ctx.sourcePath}
              toggleState={false}
              view={cm}
              pos={{ from: pos + 3, to: endPos - 3 }}
              plugin={plugin}
              dom={dom}
            />
          );
        }
      }
    }
  } else if (nativeLink) {
    // In Read Mode, just hide the native link
    (nativeLink as HTMLElement).style.display = 'none';
  }

  const reactEl = createRoot(container);

  // Extract the link text from src attribute
  const linkText = embedLink.replace(/^.*\//, ''); // Remove path if present
  reactEl.render(
    <UINote
      load={true}
      plugin={plugin}
      path={linkText}
      source={ctx.sourcePath}
      isReadOnly={true}
    />
  );
}
