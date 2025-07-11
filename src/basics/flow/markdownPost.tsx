import { EditorView } from "@codemirror/view";
import { FlowEditorHover } from "basics/flow/FlowEditorHover";
import { UINote } from "basics/ui/UINote";
import { UIMultilineBlock } from "basics/ui/UIMultilineBlock";
import BlockLinkPlus from "main";
import { App, MarkdownPostProcessorContext } from "obsidian";
import React from "react";
import { createRoot } from "react-dom/client";
import { MarkdownView } from "obsidian";
import { getLineRangeFromRef } from "shared/utils/obsidian";

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

    const multiLineBlockRegex = /#\^([a-z0-9]+)-\1$/;
    if (!multiLineBlockRegex.test(embedLink)) {
      return;
    }

    // Check if already processed (prevent double processing)
    if (dom.classList.contains('mk-multiline-processed')) {
      return;
    }

    // Mark as processed and add multiline block identifier
    dom.classList.add('mk-multiline-processed');
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

    // Create external edit icon (仅在 Live Preview 显示)
    if (showEditIcon) {
      // Create external edit icon container on the dom level
      const externalEditIcon = dom.createDiv('mk-multiline-external-edit');
      externalEditIcon.style.cssText = `
        position: absolute;
        top: -34px;
        right: 0px;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: var(--layer-popover);
        pointer-events: auto;
        display: flex;
      `;
      
      externalEditIcon.innerHTML = `
        <div class="mk-flowblock-menu">
          <button class="mk-toolbar-button" aria-label="Edit block">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>
            </svg>
          </button>
        </div>
      `;
      
      externalEditIcon.title = 'Edit block';
      
      // Add hover effects for the multiline block container
      const showEditIconHandler = () => {
        externalEditIcon.style.opacity = '1';
        externalEditIcon.style.visibility = 'visible';
      };
      
      const hideEditIconHandler = () => {
        externalEditIcon.style.opacity = '0';
        externalEditIcon.style.visibility = 'hidden';
      };
      
      // Show/hide edit icon when hovering over the multiline block
      dom.addEventListener('mouseenter', showEditIconHandler);
      dom.addEventListener('mouseleave', hideEditIconHandler);
      
      // Keep edit icon visible when hovering over the icon itself
      externalEditIcon.addEventListener('mouseenter', showEditIconHandler);
      externalEditIcon.addEventListener('mouseleave', hideEditIconHandler);
      
      // Add hover effects and click handler for the edit button
      const editButton = externalEditIcon.querySelector('.mk-toolbar-button') as HTMLElement;
      if (editButton) {
        editButton.addEventListener('mouseenter', () => {
          editButton.style.color = 'var(--text-accent)';
          editButton.style.background = 'var(--background-modifier-hover)';
        });
        
        editButton.addEventListener('mouseleave', () => {
          editButton.style.color = 'var(--mk-ui-text-tertiary)';
          editButton.style.background = 'rgba(var(--nav-item-background-active), 0.3)';
        });
        
        // Add click handler - toggle between ![[]] and !![[]]
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          try {
            const cm: EditorView | undefined = getCMFromElement(dom, app);
            if (cm) {
              // Find the position of this multiline block in the document
              const pos = cm.posAtDOM(dom);
              if (pos !== null) {
                // Look for the ![[]] pattern at this position
                const line = cm.state.doc.lineAt(pos);
                const lineText = line.text;
                
                // Find the ![[]] pattern in this line
                const embedPattern = /!\[\[([^\]]+)\]\]/;
                const match = lineText.match(embedPattern);
                
                if (match) {
                  // Calculate the position of the ! character
                  const embedStart = line.from + lineText.indexOf(match[0]);
                  
                  // Toggle: ![[]] -> !![[]]
                  cm.dispatch({
                    changes: {
                      from: embedStart,
                      to: embedStart,
                      insert: "!"
                    },
                    scrollIntoView: true
                  });
                  
                  cm.focus();
                  console.log('Toggled multiline block to editable mode');
                } else {
                  console.warn('Could not find embed pattern in line:', lineText);
                }
              }
            }
          } catch (error) {
            console.error('Toggle multiline block failed:', error);
          }
        });
      }
    }

    // Step 7: Render UIMultilineBlock with native embed structure
    console.log('Step 7: Rendering UIMultilineBlock with native embed structure:', embedLink);
    
    const reactEl = createRoot(dom);
    reactEl.render(
      <UIMultilineBlock
        plugin={plugin}
        blockRef={embedLink}
        source={ctx.sourcePath}
        showEditIcon={showEditIcon}
        onEdit={() => {
          // 切换 ![[]] 为 !![[]]
          try {
            const cm: EditorView | undefined = getCMFromElement(dom, app);
            if (cm) {
              // 找到DOM元素在文档中的位置
              const pos = cm.posAtDOM(dom);
              if (pos !== null) {
                // 查找该行中的![[]]模式
                const line = cm.state.doc.lineAt(pos);
                const lineText = line.text;
                
                // 查找该行中的![[]]模式
                const embedPattern = /!\[\[([^\]]+)\]\]/;
                const match = lineText.match(embedPattern);
                
                if (match) {
                  // 计算!字符的位置
                  const embedStart = line.from + lineText.indexOf(match[0]);
                  
                  // 切换: ![[]] -> !![[]]
                  cm.dispatch({
                    changes: {
                      from: embedStart,
                      to: embedStart,
                      insert: "!"
                    },
                    scrollIntoView: true
                  });
                  
                  cm.focus();
                  console.log('Toggled multiline block to editable mode');
                } else {
                  console.warn('Could not find embed pattern in line:', lineText);
                }
              }
            }
          } catch (error) {
            console.error('Toggle multiline block failed:', error);
          }
        }}
      />
    );

  } catch (error) {
    console.error('Failed to process multiline block embed:', error);
    // Graceful degradation: show error message
    const errorContainer = dom.createDiv('mk-multiline-block-error');
    errorContainer.style.cssText = 'padding: 10px; background: #ffebee; border: 1px solid #f44336; color: #c62828;';
    errorContainer.textContent = `Error processing multiline block: ${error.message}`;
  }
}
