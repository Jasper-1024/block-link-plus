import { EditorState, RangeSetBuilder, StateField, StateEffect, Compartment } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { cmExtensions } from "basics/cmExtensions";
import {
  flowEditorDecoration,
  flowEditorInfo,
  FlowEditorLinkType,
  flowEditorSelector,
  FlowEditorState,
  flowEditorWidgetDecoration,
} from "basics/codemirror/flowEditor";
import { compareByField } from "basics/utils/utils";
import BlockLinkPlus from "main";
import {
  App,
  Editor,
  Notice,
  TFile,
  TFolder,
} from "obsidian";
import { createRoot } from "react-dom/client";
import i18n from "shared/i18n";
import { SelectOption } from "shared/types/menu";
import { SpaceFragmentSchema } from "shared/types/spaceFragment";
import { editableRange } from "shared/utils/codemirror/selectiveEditor";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { openPathInElement } from "shared/utils/openPathInElement";
import { parseURI } from "shared/utils/uri";

import { BasicDefaultSettings } from "basics/schemas/settings";
import { Command } from "basics/types/command";
import { Enactor, ReadOnlyConfig } from "./enactor";

const flowEditorRangeset = (state: EditorState, plugin: BlockLinkPlus) => {
  const builder = new RangeSetBuilder<Decoration>();
  const infoFields = state.field(flowEditorInfo, false);
  if (!infoFields) return builder.finish();
  const values = [] as { start: number; end: number; decoration: Decoration }[];
  for (const info of infoFields) {
    const { from, to, type, expandedState } = info;
    const lineFix =
      from - 3 == state.doc.lineAt(from).from &&
      to + 2 == state.doc.lineAt(from).to;
    if (type == FlowEditorLinkType.Link) {
      if (expandedState == FlowEditorState.Open) {
        values.push({
          start: to + 2,
          end: to + 2,
          decoration: flowEditorDecoration(info, plugin),
        });
      }
    } else if (
      expandedState == FlowEditorState.Open &&
      type == FlowEditorLinkType.Embed
    ) {
      if (
        !(
          (state.selection.main.from == from - 4 &&
            state.selection.main.to == to + 2) ||
          (state.selection.main.from >= from - 3 &&
            state.selection.main.to <= to + 1)
        )
      ) {
        values.push({
          start: from - 4,
          end: from - 3,
          decoration: flowEditorSelector(info, plugin),
        });
        if (lineFix) {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorWidgetDecoration(info, plugin),
          });
        } else {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorDecoration(info, plugin),
          });
        }
      }
    } else if (
      expandedState == FlowEditorState.Open &&
      type == FlowEditorLinkType.ReadOnlyEmbed
    ) {

      const condition1 = state.selection.main.from == from - 3 && state.selection.main.to == to + 2;
      const condition2 = state.selection.main.from >= from - 3 && state.selection.main.to <= to + 2;
      const shouldSkip = condition1 || condition2;

      if (!shouldSkip) {
        if (lineFix) {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorWidgetDecoration(info, plugin),
          });
        } else {
          values.push({
            start: from - 3,
            end: to + 2,
            decoration: flowEditorDecoration(info, plugin),
          });
        }
      }
    }
  }
  values.sort(compareByField("start", true));
  for (const value of values) {
    builder.add(value.start, value.end, value.decoration);
  }
  const dec = builder.finish();
  return dec;
};

const flowEditorField = (plugin: BlockLinkPlus) =>
  StateField.define<DecorationSet>({
    create(state) {
      return flowEditorRangeset(state, plugin);
    },
    update(value, tr) {
      return flowEditorRangeset(tr.state, plugin);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

export class ObsidianEnactor implements Enactor {
  constructor(public plugin: BlockLinkPlus) { }

  name = "Obsidian";
  load() {
    this.plugin.settings = Object.assign(
      {},
      BasicDefaultSettings,
      this.plugin.settings
    );
    this.loadCommands();
  }
  loadCommands() {
    this.plugin.addCommand({
      id: "mk-flow-editor",
      name: "Toggle Flow Editor",
      callback: () => {
        this.plugin.settings.editorFlow = !this.plugin.settings.editorFlow;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.flowEditorManager.reloadExtensions(false);
      },
    });
    return [
      {
        label: "embed",
        value: `![[]]`,
        icon: "mk-make-embed",
      },
      {
        label: "link",
        value: `[[]]`,
        icon: "mk-make-link",
      },
    ] as Command[];
  }
  loadExtensions(firstLoad: boolean) {
    const extensions = cmExtensions(this.plugin);
    if (firstLoad) {
      this.plugin.registerEditorExtension(extensions);
    }
    if (this.plugin.settings.editorFlow) {
      this.plugin.registerEditorExtension(flowEditorField(this.plugin));
    }
  }
  uriByString(uri: string, source?: string) {
    if (!uri) return null;

    let basePath = uri;
    let subpath: string | undefined;

    if (uri.includes('#')) {
      const parts = uri.split('#');
      basePath = parts[0];
      subpath = '#' + parts.slice(1).join('#');
    }

    if (source) {
      const file = this.plugin.app.metadataCache.getFirstLinkpathDest(basePath, source);
      // If the file is not found, we can't proceed.
      if (!file) return null;
      basePath = file.path;
    }

    const finalUri = subpath ? `${basePath}${subpath}` : basePath;
    return parseURI(finalUri);
  }
  openPath(path: string, source?: HTMLElement, config?: ReadOnlyConfig) {
    const uri = this.uriByString(path);
    if (!uri) {
      new Notice(`File not found: ${path}`);
      return;
    }
    openPathInElement(
      this.plugin.app,
      this.plugin.app.workspace.getLeaf(),
      source,
      undefined,
      async (editor) => {
        const leaf = editor.attachLeaf();
        if (this.plugin.app.vault.getAbstractFileByPath(uri.basePath) instanceof TFile) {
          await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(uri.basePath) as TFile);
          const selectiveRange = getLineRangeFromRef(uri.basePath, uri.refStr, this.plugin.app);
          if (!leaf.view?.editor) return;
          if (selectiveRange[0] && selectiveRange[1]) {
            // 验证范围是否在文档边界内
            const editor = leaf.view.editor;
            const docLines = editor.cm.state.doc.lines;

            // 确保范围在文档边界内
            const validStart = Math.max(1, Math.min(selectiveRange[0], docLines));
            const validEnd = Math.max(validStart, Math.min(selectiveRange[1], docLines));

            if (validStart <= docLines && validEnd <= docLines) {
              try {
                editor.cm.dispatch({
                  annotations: [editableRange.of([validStart, validEnd])],
                });
              } catch (error) {
                console.error(error);
              }
            }

            // 应用只读配置
            if (config?.readOnly) {
              setTimeout(() => {
                // 延迟应用只读配置，确保编辑器完全加载
                if (leaf.view?.editor) {
                  this.applyReadOnlyMode(leaf.view.editor, config);
                }
              }, 100);
            }
          }
        }
      }
    );
  }

  private applyReadOnlyMode(editor: Editor, config: ReadOnlyConfig) {


    // 应用只读配置到编辑器
    if (editor?.cm) {
      const extensions = [];

      // 禁用编辑功能
      if (config.readOnly) {
        extensions.push(EditorView.editable.of(false));
      }

      // 如果需要隐藏行号
      if (config.hideGutter) {
        // 通过CSS类隐藏行号
        extensions.push(EditorView.theme({
          '.cm-gutters': { display: 'none' },
          '.cm-lineNumbers': { display: 'none' }
        }));
      }

      // 应用扩展 - 使用正确的StateEffect
      if (extensions.length > 0) {
        try {

          const beforeEditable = editor.cm.state.facet(EditorView.editable);

          // 研究1: 尝试 StateEffect.appendConfig
          editor.cm.dispatch({
            effects: StateEffect.appendConfig.of(extensions)
          });

          // 研究2: 尝试使用 Compartment 方式 (如果 appendConfig 失败)

          // 验证应用后的状态
          setTimeout(() => {
            const afterEditable = editor.cm.state.facet(EditorView.editable);
            const contentElement = editor.cm.dom.querySelector('.cm-content') as HTMLElement;

            // 尝试手动触发编辑测试
            if (afterEditable === false) {

              // 进一步验证：尝试模拟用户输入
              try {
                const testTransaction = editor.cm.state.update({
                  changes: { from: 0, insert: "test" }
                });
              } catch (error) {
                console.error(error);
              }

            } else {
              // 如果 StateEffect.appendConfig 没有工作，尝试 Compartment
              try {
                const editableCompartment = new Compartment();
                const editableConfig = editableCompartment.of(EditorView.editable.of(false));

                editor.cm.dispatch({
                  effects: StateEffect.appendConfig.of([editableConfig])
                });

                // 再次验证
                setTimeout(() => {
                  const finalEditable = editor.cm.state.facet(EditorView.editable);

                  if (finalEditable === false) {
                  } else {
                    this.applyCSSReadOnlyMode(editor, config);
                  }
                }, 50);

              } catch (compartmentError) {
                this.applyCSSReadOnlyMode(editor, config);
              }
            }
          }, 50);
        } catch (error) {
          // 回退方案：通过CSS直接禁用编辑
          this.applyCSSReadOnlyMode(editor, config);
        }
      }
    }
  }

  private applyCSSReadOnlyMode(editor: Editor, config: ReadOnlyConfig) {


    if (editor?.cm?.dom) {
      const editorElement = editor.cm.dom as HTMLElement;

      // 禁用编辑
      if (config.readOnly) {
        const contentElement = editorElement.querySelector('.cm-content') as HTMLElement;
        if (contentElement) {
          contentElement.contentEditable = 'false';
          contentElement.style.pointerEvents = 'none';
        }
      }

      // 隐藏行号
      if (config.hideGutter) {
        const gutterElement = editorElement.querySelector('.cm-gutters') as HTMLElement;
        if (gutterElement) {
          gutterElement.style.display = 'none';
        }
      }

      // 添加只读样式类
      editorElement.classList.add('blp-readonly-editor');

      // 深度检查嵌套编辑器
      const nestedEditors = editorElement.querySelectorAll('.cm-editor');
      if (nestedEditors.length > 1) {
        nestedEditors.forEach((nestedEditor, index) => {
          if (index > 0) { // 跳过第一个（当前编辑器）
            const nestedContent = nestedEditor.querySelector('.cm-content') as HTMLElement;
            if (nestedContent) {
              nestedContent.contentEditable = 'false';
              nestedContent.style.pointerEvents = 'none';
              (nestedEditor as HTMLElement).classList.add('blp-readonly-editor');
            }
          }
        });
      }
    }
  }
}
