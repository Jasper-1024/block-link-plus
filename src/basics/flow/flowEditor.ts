import { EditorView } from "@codemirror/view";


import BlockLinkPlus from "main";
import { MarkdownView, WorkspaceLeaf } from "obsidian";
import i18n from "shared/i18n";
import { FlowEditorInfo, flowEditorInfo } from "../codemirror/flowEditor";

export const parseOutReferences = (
  ostr: string
): [string, string | undefined] => {
  const str = ostr.split("|")[0];
  const refIndex = str.lastIndexOf("#");
  return refIndex > 0
    ? [str.substring(0, refIndex), str.substring(refIndex + 1)]
    : [str, undefined];
};



export const loadFlowEditorByDOM = (
  plugin: BlockLinkPlus,
  el: HTMLElement,
  view: EditorView,
  id: string
) => {
  setTimeout(async () => {
    //wait for el to be attached to the displayed document
    let counter = 0;
    while (!el.parentElement && counter++ <= 50) await sleep(50);
    if (!el.parentElement) return;
    let dom: HTMLElement = el;
    while (
      !dom.hasClass("mk-floweditor") &&
      !dom.hasClass("workspace") &&
      dom.parentElement
    ) {
      dom = dom.parentElement;
    }

    if (
      !dom.hasClass("mk-floweditor") &&
      !dom.hasClass("workspace") &&
      !(dom.nodeName == "HTML")
    ) {
      return;
    }
    setTimeout(async () => {
      //wait for el to be attached to the displayed document
      let leafFound = false;
      const activeEditor = plugin.app.workspace.activeEditor;
      if (activeEditor?.editor?.cm && activeEditor.editor.cm.dom == view.dom) {
          leafFound = true;
          plugin.app.workspace.iterateLeaves((leaf) => {
            const leafCM = leaf.view.editor?.cm;
            if (leafCM && leafCM.dom == view.dom) {
              loadFlowEditorsForLeafForID(
                leaf,
                leafCM,
                activeEditor.file?.path,
                plugin,
                id
              );
            }
          }, plugin.app.workspace["rootSplit"]!);
          
        }
      if (!leafFound) {
        plugin.app.workspace.iterateLeaves((leaf) => {
          const cm = leaf.view.editor?.cm as EditorView;
          if (cm && view.dom == cm.dom) {
            leafFound = true;
            loadFlowEditorsForLeafForID(
              leaf,
              cm,
              (leaf.view as MarkdownView).file?.path,
              plugin,
              id
            );
          }
        }, plugin.app.workspace["rootSplit"]!);
      }
    });
  });
};
export const loadFlowEditorsForLeafForID = (
  leaf: WorkspaceLeaf,
  cm: EditorView,
  source: string | undefined,
  plugin: BlockLinkPlus,
  id: string
) => {
  if (!source) return;

  const stateField = cm.state.field(flowEditorInfo, false);
  if (!stateField) return;
  const flowInfo = stateField.find((f) => f.id == id);
  if (flowInfo && flowInfo.expandedState == 2) {
    loadFlowEditor(leaf, cm, flowInfo, source, plugin);
  }
};

const loadFlowEditor = async (
  leaf: WorkspaceLeaf,
  cm: EditorView,
  flowEditorInfo: FlowEditorInfo,
  source: string,
  plugin: BlockLinkPlus
) => {
  const dom = cm.dom.querySelector(
    "#mk-flow-" + flowEditorInfo.id
  ) as HTMLElement;
  
  const path = plugin.enactor.uriByString(flowEditorInfo.link, source);
  if (!path) return;

  const basePath =
    plugin.app.metadataCache.getFirstLinkpathDest(path.basePath, source)?.path ??
    path.basePath;

  if (dom) {

    const spaceCache = false;
    if (spaceCache) {
      
      if (!dom.hasAttribute("ready")) {
        // dom.empty();
        dom.setAttribute("ready", "");
        plugin.enactor.openPath(path.fullPath, dom);
        
        return;
      }
    } else  {
      

       const file = plugin.app.vault.getAbstractFileByPath(basePath);
    if (file) {
      if (!dom.hasAttribute("ready")) {
        // dom.empty();
        dom.setAttribute("ready", "");
        plugin.enactor.openPath(path.fullPath, dom);
        
      }
    } else {
      
      dom.innerHTML = "";
      const createDiv = dom.createDiv("file-embed");
      createDiv.classList.add("mod-empty");
      const createFile = async (e: MouseEvent) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        const newPath = basePath.endsWith(".md") ? basePath : `${basePath}.md`;
        await plugin.app.vault.create(newPath, "");
        loadFlowEditor(leaf, cm, flowEditorInfo, source, plugin);
      };
      createDiv.setText(`"${basePath}" ` + i18n.labels.noFile);
      createDiv.addEventListener("click", createFile);
    }
  }
  }
};



