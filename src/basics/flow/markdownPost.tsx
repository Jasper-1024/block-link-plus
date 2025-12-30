import { EditorView } from "@codemirror/view";
import { FlowEditorHover } from "basics/flow/FlowEditorHover";
import { UIMultilineBlock } from "basics/ui/UIMultilineBlock";
import BlockLinkPlus from "main";
import { App, MarkdownPostProcessorContext } from "obsidian";
import React from "react";
import { Root, createRoot } from "react-dom/client";
import { MarkdownView } from "obsidian";
import { getLineRangeFromRef } from "shared/utils/obsidian";

// Map to store React roots for proper lifecycle management
// Using Map instead of WeakMap for better control
const multilineBlockRoots = new Map<HTMLElement, Root>();

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
export const replaceMarkdownForEmbeds = (
  el: HTMLElement,
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
    // Skip processing for multi-line block embeds
    const embedLink = dom.getAttribute('src');
    if (embedLink) {
      const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
      if (multiLineBlockRegex.test(embedLink)) {
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
        const cm: EditorView | undefined = getCMFromElement(el, app);
        if (cm) {
          if (!dom.parentElement) return;
          const pos = cm.posAtDOM(dom);
          const index = [
            ...Array.from(dom.parentElement.childNodes),
          ].indexOf(dom);
          if (index == -1) return;
          const nextDom = dom.parentElement.childNodes[index];
          const endPos = cm.posAtDOM(nextDom as HTMLElement);

          if (ctx.sourcePath && pos !== null && endPos !== null)
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
  });
};

export const replaceMultilineBlocks = (
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App
) => {
  // Handle the case where the element is directly the embed in Reading mode
  if (el.classList.contains('internal-embed') && el.classList.contains('markdown-embed')) {
    processMultilineEmbed(el, ctx, plugin, app);
    return;
  }

  replaceMarkdownForEmbeds(el, async (dom) => {
    processMultilineEmbed(dom, ctx, plugin, app);
  });
};

function processMultilineEmbed(
  dom: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App
) {
  try {
    // Check if this is a multi-line block embed
    let embedLink = dom.getAttribute('src');
    const altText = dom.getAttribute('alt');

    // If src is null, try to recover from alt attribute
    if (!embedLink && altText) {
      const match = altText.match(/(.+?)\s*>\s*(.+)/);
      if (match) {
        embedLink = match[1].trim() + '#' + match[2].trim();
        dom.setAttribute('src', embedLink);
      }
    }

    if (!embedLink) {
      return;
    }

    // Extract the actual link part (remove alias if present)
    // Handle both [[file#^xyz-xyz|alias]] and [[file#^xyz-xyz]] formats
    let actualLink = embedLink;
    const pipeIndex = embedLink.indexOf('|');
    if (pipeIndex !== -1) {
      actualLink = embedLink.substring(0, pipeIndex);
    }

    const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
    if (!multiLineBlockRegex.test(actualLink)) {
      return;
    }

    // Check if already processed by looking for actual content instead of class names
    const hasFlowEditor = dom.querySelector('.mk-floweditor');
    const hasReactContent = dom.querySelector('.mk-multiline-ref');
    
    if (hasFlowEditor || hasReactContent) {
      // Content exists, skip processing
      return;
    }
    
    // Remove any orphaned elements
    const orphanedEditIcon = dom.querySelector('.mk-multiline-external-edit');
    if (orphanedEditIcon) {
      orphanedEditIcon.remove();
    }

    // Add multiline block identifier for styling
    dom.classList.add('mk-multiline-block');

    // Hide the native rendering
    const nativeContent = dom.querySelector('.markdown-embed-content');
    if (nativeContent) {
      (nativeContent as HTMLElement).style.display = 'none';
    }

    // Hide the native link
    const nativeLink = dom.querySelector('.markdown-embed-link');
    if (nativeLink) {
      (nativeLink as HTMLElement).style.display = 'none';
    }


    // Step 7: Render UIMultilineBlock with native embed structure
    // Check if a React root already exists for this DOM element
    if (multilineBlockRoots.has(dom)) {
      // Unmount the existing root before creating a new one
      const existingRoot = multilineBlockRoots.get(dom);
      try {
        existingRoot!.unmount();
      } catch (error) {
        // Silently handle unmount errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error unmounting existing React root:', error);
        }
      }
      multilineBlockRoots.delete(dom);
    }
    
    // Create a container div for React to manage
    const reactContainer = dom.createDiv('mk-multiline-react-container');
    
    const reactEl = createRoot(reactContainer);
    // Store the React root for proper lifecycle management
    multilineBlockRoots.set(reactContainer, reactEl);
    
    reactEl.render(
      <UIMultilineBlock
        plugin={plugin}
        blockRef={actualLink}
        source={ctx.sourcePath}
      />
    );

  } catch (error) {
    console.error('Failed to process multiline block embed:', error);
    // Graceful degradation: show error message only if it's not a DOM-related error
    if (!(error instanceof DOMException)) {
      const errorContainer = dom.createDiv('mk-multiline-block-error');
      errorContainer.style.cssText = 'padding: 10px; background: #ffebee; border: 1px solid #f44336; color: #c62828;';
      errorContainer.textContent = `Error processing multiline block: ${error.message}`;
    }
  }
}

// Cleanup function to unmount React roots when DOM is removed
export const cleanupMultilineBlocks = () => {
  // Clean up disconnected React roots
  const toDelete: HTMLElement[] = [];
  
  multilineBlockRoots.forEach((root, dom) => {
    if (!dom.isConnected) {
      // DOM is disconnected
      try {
        // Try to unmount gracefully
        root.unmount();
      } catch (error) {
        // Ignore unmount errors for disconnected DOM
        if (process.env.NODE_ENV === 'development') {
          console.debug('Cleanup: Root already unmounted or DOM disconnected', error);
        }
      }
      toDelete.push(dom);
    }
  });
  
  // Remove from map
  toDelete.forEach(dom => multilineBlockRoots.delete(dom));
};
