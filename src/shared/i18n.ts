import moment from "moment";

class T {
  lang: 'en' | 'zh' | 'zh-TW' = 'en';

  all = {
    en: {
      // Flow Editor buttons - 实际使用的按钮文本
      buttons: {
        openFlow: "Open Flow",
        hideFlow: "Hide Flow", 
        toggleFlow: "Toggle Flow",
        // 表格相关按钮 - FlowEditorHover 中使用
        cutTable: "Cut Table",
        deleteTable: "Delete Table",
      },

      // 标签文本 - 实际使用的标签
      labels: {
        noFile: "not found",
        placeholder: "Type ${1} to open the Flow Menu",
        notePlaceholder: "Click to create a new note",
      },

      // 命令面板条目 - flowCommands 中使用
      commandPalette: {
        openFlow: "Open Flow Editor",
        closeFlow: "Close Flow Editor",
      },

      // 通知消息 - FlowEditorHover 中使用
      notice: {
        tableDeleted: "Table deleted",
      },

      // Settings used in SettingsPanel.ts and SettingsTab.ts
      settings: {
        // Plugin title
        pluginTitle: "Block Link Plus",

        // Multi-line behavior
        multiLineHandle: {
          name: "Multi-line block behavior",
          desc: "Define how multi-line selections generate block ids.",
          options: {
            default: "Default",
            addHeading: "Add new heading", 
            addMultiBlock: "Add multi block",
            addMultilineBlock: "Add multiline block"
          },
          descriptions: {
            default: "Treats multi-line selections as a single block. Creates one block ID ^abc123 at the end of the selection.",
            addHeading: "Adds a new heading above the selection. Creates a heading with block ID for organization.",
            addMultiBlock: "Creates separate block IDs for each block (paragraph, list item, etc.). Each block gets its own ^abc123 identifier.",
            addMultilineBlock: "Creates a range block with ^abc123-abc123 format. Marks the first line with ^abc123 and marks the range end with ^abc123-abc123 (inline when safe; otherwise inserted on its own line)."
          }
        },

        // Block link section
        blockLink: {
          title: "Block link",
          desc: "Link: [[file#block_id]]",
          enableRightClick: {
            name: "Enable block link in right click menu",
            desc: ""
          },
          enableNotification: {
            name: "Show notification when block link is copied",
            desc: ""
          },
          aliasStyle: {
            name: "Alias style",
            desc: "Choose how to generate aliases for block links. For heading blocks, alias will always be the heading text unless 'No alias' is selected.",
            options: {
              noAlias: "No alias",
              firstChars: "First X chars", 
              parentHeading: "Parent heading",
              selectedText: "Selected text"
            },
            descriptions: {
              noAlias: "Links will appear as [[file#^abc123]] without any alias text.",
              firstChars: "Links will use the first X characters of the block content as alias: [[file#^abc123|First few words...]]",
              parentHeading: "Links will use the nearest parent heading as alias: [[file#^abc123|Parent Heading]]",
              selectedText: "Links will use the selected text as alias: [[file#^abc123|Your selected text]]"
            }
          },
          aliasLength: {
            name: "Alias length",
            desc: "Set the length of the alias (1-100). Only used when alias style is 'First X chars'."
          },
          headingIdNewline: {
            name: "Experimental: Heading block ID style",
            desc: "Place block ID in new line when selecting a single heading line only"
          }
        },

        // Embed link section
        embedLink: {
          title: "Embed link",
          desc: "Link: ![[file#block_id]]",
          enableRightClick: {
            name: "Enable embed link in right click menu",
            desc: ""
          },
          enableNotification: {
            name: "Show notification when embed link is copied", 
            desc: ""
          }
        },

        // Inline edit
        inlineEdit: {
          title: "Inline edit",
          desc: "Control which ![[...]] embeds are editable in Live Preview.",
          enable: {
            name: "Enable inline edit",
            desc: "If enabled, supported ![[...]] embeds may become editable in Live Preview."
          },
          file: {
            name: "Enable file embeds (![[file]])",
            desc: "If enabled, ![[file]] may become editable in Live Preview."
          },
          heading: {
            name: "Enable heading embeds (![[file#Heading]])",
            desc: "If enabled, ![[file#Heading]] may become editable in Live Preview."
          },
          block: {
            name: "Enable block embeds (![[file#^id]] / ![[file#^id-id]])",
            desc: "If enabled, ![[file#^id]] and ![[file#^id-id]] may become editable in Live Preview."
          }
        },

        // Obsidian URI section
        obsidianUri: {
          title: "Obsidian URI link",
          desc: "Link: obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}",
          enableRightClick: {
            name: "Enable Obsidian URI link in right click menu",
            desc: ""
          },
          enableNotification: {
            name: "Show notification when URI link is copied",
            desc: ""
          }
        },

        // Block ID section
        blockId: {
          title: "Block Id",
          desc: "Custom block_id",
          maxLength: {
            name: "Max block id Length",
            desc: "Set the maximum number of characters for a block id."
          },
          enablePrefix: {
            name: "Custom id prefix",
            desc: ""
          },
          prefix: {
            name: "Block id prefix", 
            desc: "Block id will be: prefix-random_str"
          }
        },

        // File Outliner (v2)
        fileOutliner: {
          title: "File Outliner (v2)",
          desc: "File-level outliner view (Logseq-like). Tail lines use Dataview inline fields + `^id` so `[[file#^id]]` works without the plugin.",
          groups: {
            scope: {
              title: "Scope",
            },
            routing: {
              title: "Routing",
            },
            display: {
              title: "Display",
            },
            interactions: {
              title: "Interactions",
            },
            editing: {
              title: "Editing",
            },
            integrations: {
              title: "Integrations",
            },
            debug: {
              title: "Debug",
            },
            behavior: {
              title: "Behavior",
            },
          },
          enabledFolders: {
            name: "Enabled folders (vault-relative)",
            desc: "One per row. Files under these folders will open in the outliner view.",
            addButton: "Add enabled folder",
            placeholder: "Daily",
          },
          enabledFiles: {
            name: "Enabled files (vault-relative)",
            desc: "One per row. Use this when you only want specific files.",
            addButton: "Add enabled file",
            placeholder: "Daily/2026-01-09.md",
          },
          frontmatterOverride: {
            name: "Frontmatter override",
            desc: "Per-file: `blp_outliner: true/false` (legacy alias: `blp_enhanced_list`).",
          },
          enableRouting: {
            name: "Enable outliner routing",
            desc: "When enabled, scoped files open in the outliner view instead of the native Markdown editor.",
          },
          hideSystemTailLines: {
            name: "Hide system tail lines",
            desc: "Hide outliner protocol tail lines in Reading mode when `[blp_sys:: 1]` is present.",
          },
          dragAndDrop: {
            name: "Enable drag & drop",
            desc: "Drag the bullet to move blocks and their subtrees.",
          },
          zoom: {
            name: "Enable zoom",
            desc: "Click the bullet to zoom into a block subtree.",
          },
          emphasisLine: {
            name: "Emphasis line (left)",
            desc: "Emphasize the active block's left connector line. When disabled, it stays muted.",
          },
          editorContextMenu: {
            enabled: {
              name: "Editor context menu",
              desc: "Replace the outliner editor right-click menu with a BLP-owned menu (supports plugin allowlist injection).",
            },
            allowedPlugins: {
              name: "Editor menu plugin allowlist",
              desc: "One plugin id per row. Only allowlisted plugins may add items to the outliner editor menu. Add `core` to include core items.",
              addButton: "Add allowlisted plugin",
              placeholder: "metadata-menu",
            },
          },
          listEditor: {
            moveUp: "Move up",
            moveDown: "Move down",
            remove: "Remove",
          },
          childrenOnSplit: {
            name: "Enter split: children behavior",
            desc: "Choose what happens to children when splitting a block with Enter.",
            options: {
              keep: "Keep children on the original block",
              move: "Move children to the new block",
            },
          },
          pasteMultiline: {
            name: "Paste multiline",
            desc: "When pasting multiple lines into a block, either split into blocks or keep as multiline.",
            options: {
              split: "Split into multiple blocks (default)",
              multiline: "Keep as multiline text in the current block",
            },
          },
          backspaceWithChildren: {
            name: "Backspace at start (block has children)",
            desc: "Choose whether Backspace merges with previous (default) or outdents the block when it has children.",
            options: {
              merge: "Merge with previous (default)",
              outdent: "Prefer outdent",
            },
          },
          tasksHelp: {
            name: "Tasks",
            desc: 'Task blocks use Obsidian-native `- [ ]` / `- [x]` on disk. Commands: "${toggleTaskStatus}" (Mod+Enter) and "${toggleTaskMarker}" (Mod+Shift+Enter). Configure hotkeys in Settings -> Hotkeys.',
          },
          debug: {
            name: "Debug logging",
            desc: "Log internal outliner errors to the DevTools console.",
          },
          commands: {
            toggleTaskStatus: "Outliner: Toggle task status",
            toggleTaskMarker: "Outliner: Toggle task marker",
          },
          contextMenu: {
            copyBlockReference: "Copy block reference",
            copyBlockEmbed: "Copy block embed",
            copyBlockUrl: "Copy block URL",
            convertToTask: "Convert to task",
            convertToNormalBlock: "Convert to normal block",
            copy: "Copy",
            cut: "Cut",
            paste: "Paste",
            pasteAsText: "Paste as text",
            delete: "Delete",
            collapse: "Collapse",
            expand: "Expand",
          },
        },

        // Enhanced List Blocks section
        enhancedListBlocks: {
          title: "Enhanced List",
          desc: "Opt-in scope for Enhanced List Blocks features (blp-view, system line hiding, duplicate ^id repair). A file is enabled if it matches any enabled folder/file below, or has frontmatter `blp_enhanced_list: true`.",
          groups: {
            scopeAndBehavior: {
              title: "Scope & Behavior",
            },
            scope: {
              title: "Enable scope",
            },
            behavior: {
              title: "Behavior",
            },
            blockMode: {
              title: "Block mode",
            },
            normalization: {
              title: "Normalization",
            },
          },
          dataviewStatus: {
            available: "✅ Dataview plugin is installed and enabled (v${version})",
            unavailable: "❌ Dataview plugin is not installed or not enabled. blp-view will not work.",
          },
          enabledFolders: {
            name: "Enabled folders",
            desc: "One folder path per line (vault-relative). Markdown files under these folders are enabled."
          },
          enabledFiles: {
            name: "Enabled files",
            desc: "One file path per line (vault-relative). These Markdown files are enabled."
          },
          hideSystemLine: {
            name: "Hide system line",
            desc: "Hide the system line (`[date:: ...] ^id`) in Live Preview and Reading mode. Turn off to show it for debugging."
          },
          handleAffordance: {
            name: "Show list handle affordance",
            desc: "Render unordered list markers as a handle in Live Preview (enabled files only) to make drag/fold interactions easier to discover."
          },
          handleActions: {
            name: "Enable list handle actions",
            desc: "Enable click-to-fold and a right-click handle menu for unordered list handles in Live Preview (enabled files only).",
            clickAction: {
              name: "Handle left-click action",
              desc: "Choose what a left-click on the list handle does. Right-click always opens the handle menu.",
              options: {
                toggleFolding: "Toggle folding",
                selectBlock: "Select block",
                menu: "Open handle menu",
                none: "None",
              },
            },
            menu: {
              toggleFolding: "Toggle folding",
              copyBlockLink: "Copy block link",
              copyBlockEmbed: "Copy block embed",
              zoomIn: "Zoom in",
              zoomOut: "Zoom out",
            }
          },
          indentCodeBlocks: {
            name: "Indent nested fenced code blocks",
            desc: "Visually indent fenced code blocks inside list items in Live Preview (enabled files only), without changing file content."
          },
          deleteSubtreeOnDelete: {
            name: "Delete children when deleting a list item",
            desc: "If enabled, deleting a parent list item will delete its nested children (Logseq/Roam style). If disabled, children stay and only the system line is removed."
          },
          hideNativeFoldIndicator: {
            name: "Hide Obsidian's built-in fold indicator",
            desc: "Hide the built-in fold triangle shown near list bullets in Live Preview (enabled files only). This reduces accidental fold/unfold when using drag-and-drop."
          },
          subtreeClipboard: {
            name: "Enable subtree clipboard (copy/cut/paste block-tree)",
            desc: "When block selection mode is active, Copy/Cut/Paste operates on list-item subtrees (block-tree semantics) instead of plain text."
          },
          doubleParenTrigger: {
            name: "Enable `((` trigger for block reference insertion",
            desc: "When enabled, typing `((` opens the Block Reference picker and replaces `((` with a standard `[[file#^id]]` reference. Recommended to keep off unless you prefer Roam/Logseq-style triggers."
          },
          blockPeek: {
            name: "Enable Block Peek (context)",
            desc: "Enable Block Peek UI affordances (handle menu + blp-view peek button) for `[[file#^id]]` blocks."
          },
          normalizeOnSave: {
            name: "Normalize list format on save",
            desc: "On save only (enabled files). Applies selected normalization rules to the list items you edited since the last save. No changes while typing.",
            rules: {
              tabsToSpaces: {
                name: "Convert leading tabs to spaces",
                desc: "Convert leading indentation tabs to spaces (configurable tab width). To avoid changing list nesting, conversion falls back to Markdown tab semantics when needed. Example (tab width = 2): `\\t- a` -> `  - a`.",
                tabSize: {
                  name: "Tab width (spaces)",
                  desc: "How many spaces a leading tab expands to during normalization. Default: 2."
                }
              },
              cleanupInvalidSystemLines: {
                name: "Remove extra / invalid system lines",
                desc: "Remove extra system lines in an edited list item (keeps the first one), and removes orphan system lines right above a list item. Example: `  [date:: ...] ^a` + `  [date:: ...] ^b` -> keep only one."
              },
              mergeSplitSystemLine: {
                name: "Merge split system line",
                desc: "Merge a two-line system line into one line. Example: `  [date:: 2026-01-26T16:01:21]` + `  ^7fp1` -> `  [date:: 2026-01-26T16:01:21] ^7fp1`."
              },
              systemLineIndent: {
                name: "Fix system line indentation",
                desc: "Force system line indentation to the list item's continuation indent (aligned to the content column after `- ` / checkbox). Example: `- a` + `[date:: ...] ^id` -> `- a` + `  [date:: ...] ^id`."
              },
              ensureSystemLineForTouchedItems: {
                name: "Ensure system line for edited list items",
                desc: "If an edited list item is missing a system line, insert it on save (and move it above child lists when needed)."
              }
            }
          },
          blpView: {
            title: "blp-view (Query/View)",
            desc: "Guardrails for blp-view execution (requires Dataview).",
            allowMaterialize: {
              name: "Allow materialize writeback",
              desc: "If disabled, blp-view blocks with render.mode=materialize will show an error and won't modify the file."
            },
            maxSourceFiles: {
              name: "Max source files per view",
              desc: "0 = unlimited. If the view needs to scan more files, it will stop with an error."
            },
            maxResults: {
              name: "Max rendered results",
              desc: "0 = unlimited. If more items match, the output will be truncated."
            },
            showDiagnostics: {
              name: "Show blp-view diagnostics",
              desc: "Show counts and timing info under the rendered output."
            }
          },
          ops: {
            title: "Enhanced List Blocks Ops",
            desc: "Outliner-like operations and UI enhancements for list-item subtrees (Live Preview only; enabled files only).",
            zoom: {
              name: "Enable zoom (Live Preview)",
              desc: "Zoom in/out to the current list subtree. Conflicts with third-party plugin: obsidian-zoom."
            },
            move: {
              name: "Enable move subtree up/down",
              desc: "Move the current list subtree up/down among siblings (current file only). Conflicts with obsidian-outliner."
            },
            indent: {
              name: "Enable indent/outdent subtree",
              desc: "Indent/outdent the current list subtree (toggleable). Conflicts with obsidian-outliner."
            },
            dragDrop: {
              name: "Enable drag-and-drop subtree",
              desc: "Drag-and-drop list subtrees within the current file (no cross-file). Conflicts with obsidian-outliner."
            },
            verticalLines: {
              name: "Enable vertical indentation lines",
              desc: "Render indentation guides in Live Preview (best-effort across themes). Conflicts with obsidian-outliner."
            },
            bulletThreading: {
              name: "Enable bullet threading",
              desc: "Highlight the active list block path (current block + ancestors). Conflicts with obsidian-outliner."
            }
          }
        },
      },

      // Only used translations - Commands
      commands: {
        // Flow commands
        h1: "Heading 1",
        h2: "Heading 2", 
        h3: "Heading 3",
        h4: "Heading 4",
        h5: "Heading 5",
        h6: "Heading 6",
        bold: "Bold",
        italic: "Italic",
        strikethrough: "Strikethrough",
        highlight: "Highlight",
        code: "Code",
        codeblock: "Code Block",
        quote: "Quote",
        link: "Link",
        image: "Image",
        table: "Table",
        divider: "Divider",
        embed: "Embed",
        tag: "Tag",
        callout: "Callout",
        list: "List",
        numberList: "Number List",
        task: "Task",
        toggleList: "Toggle List",
        space: "Space",
        newNote: "New Note",
        newFolder: "New Folder",
      },

      // Commands suggest
      commandsSuggest: {
        noResult: "No results found",
      },

      // Metadata types used in metadata.ts
      metadataTypes: {
        fileName: "File Name",
        path: "Path", 
        folder: "Folder",
        created: "Created",
        lastModified: "Last Modified",
        extension: "Extension",
        size: "Size",
        tags: "Tags",
        inlinks: "Inlinks", 
        outlinks: "Outlinks",
        color: "Color",
      },

      // What's New modal (shown after upgrade)
      whatsNew: {
        titleWithVersion: "Block Link Plus — What's new in v${1}",
        updatedFromTo: "Updated from v${1} to v${2}",
        viewChangelog: "View full changelog",
        close: "Close",
        v1_8_0: [
          "Inline Edit: migrated to a native leaf-based engine (ported from sync-embeds; more reliable in Live Preview).",
          "Removed legacy `!![[...]]` syntax; use `![[...]]`.",
          "Multi-line blocks: improved `^id-id` range creation (inline when safe; otherwise standalone after the block).",
          "Fix: when selection stays within a single list item, range markers stay scoped to that item (no accidental expansion to the whole list).",
          "Fix: multi-block mode targets blocks (paragraphs/list items); list item IDs are inserted at the end of the item when needed (#22/#27).",
          "`^id-id` range embeds render consistently (including when Inline Edit is disabled).",
          "Fix: reading-mode postprocessor no longer blanks notes (#29).",
          "New: show a What's New modal once after upgrade.",
        ],
        fallback: [
          "See the full changelog for details.",
        ],
      },

      // Notices
      notices: {
        fileOutlinerUnsupportedBlockMarkdown:
          "Block contains list/heading syntax. Rendered as plain text to preserve outliner structure.",
      }
    },
    zh: {
      // Flow Editor buttons - 流程编辑器按钮文本
      buttons: {
        openFlow: "打开流程",
        hideFlow: "隐藏流程", 
        toggleFlow: "切换流程",
        // 表格相关按钮
        cutTable: "剪切表格",
        deleteTable: "删除表格",
      },

      // 标签文本
      labels: {
        noFile: "未找到",
        placeholder: "输入 ${1} 打开流程菜单",
        notePlaceholder: "点击创建新笔记",
      },

      // 命令面板条目
      commandPalette: {
        openFlow: "打开流程编辑器",
        closeFlow: "关闭流程编辑器",
      },

      // 通知消息
      notice: {
        tableDeleted: "表格已删除",
      },

      // 设置面板文本
      settings: {
        // 插件标题
        pluginTitle: "Block Link Plus",

        // 多行行为
        multiLineHandle: {
          name: "多行块行为",
          desc: "定义多行选择如何生成块 ID。'默认' 将它们视为单行处理。",
          options: {
            default: "默认",
            addHeading: "添加新标题", 
            addMultiBlock: "添加多块",
            addMultilineBlock: "添加多行块"
          },
          descriptions: {
            default: "将多行选择视为单个块。在选择末尾创建一个块 ID ^abc123。",
            addHeading: "在选择上方添加一个新标题。为组织创建一个带块 ID 的标题。",
            addMultiBlock: "为每个块（段落、列表项等）创建单独的块 ID。每个块获得自己的 ^abc123 标识符。",
            addMultilineBlock: "创建一个 ^abc123-abc123 格式的范围块。用 ^abc123 标记第一行，并在最后一行后添加 ^abc123-abc123 以精确引用多行。"
          }
        },

        // 块链接部分
        blockLink: {
          title: "块链接",
          desc: "链接格式：[[文件#块id]]",
          enableRightClick: {
            name: "在右键菜单中启用块链接",
            desc: ""
          },
          enableNotification: {
            name: "复制块链接时显示通知",
            desc: ""
          },
          aliasStyle: {
            name: "别名样式",
            desc: "选择如何为块链接生成别名。对于标题块，除非选择'无别名'，否则别名始终是标题文本。",
            options: {
              noAlias: "无别名",
              firstChars: "前 X 个字符", 
              parentHeading: "父标题",
              selectedText: "选中文本"
            },
            descriptions: {
              noAlias: "链接将显示为 [[文件#^abc123]] 没有别名文本。",
              firstChars: "链接将使用块内容的第一个 X 个字符作为别名：[[文件#^abc123|前几个词...]]",
              parentHeading: "链接将使用最近的父标题作为别名：[[文件#^abc123|父标题]]",
              selectedText: "链接将使用选中的文本作为别名：[[文件#^abc123|您选中的文本]]"
            }
          },
          aliasLength: {
            name: "别名长度",
            desc: "设置别名的长度(1-100) 仅在别名样式为'前 X 个字符'时使用。"
          },
          headingIdNewline: {
            name: "实验性：标题块 ID 样式",
            desc: "仅选择单个标题行时，将块 ID 放在新行中"
          }
        },

        // 嵌入链接部分
        embedLink: {
          title: "嵌入链接",
          desc: "链接格式：![[文件#块id]]",
          enableRightClick: {
            name: "在右键菜单中启用嵌入链接",
            desc: ""
          },
          enableNotification: {
            name: "复制嵌入链接时显示通知", 
            desc: ""
          }
        },

        // Inline edit
        inlineEdit: {
          title: "内联编辑",
          desc: "控制 Live Preview 下哪些 ![[...]] 嵌入允许就地编辑。",
          enable: {
            name: "启用内联编辑",
            desc: "启用后，支持的 ![[...]] 嵌入在 Live Preview 中可能可编辑。"
          },
          file: {
            name: "允许文件嵌入 (![[file]])",
            desc: "启用后，![[file]] 在 Live Preview 中可能可编辑。"
          },
          heading: {
            name: "允许标题嵌入 (![[file#Heading]])",
            desc: "启用后，![[file#Heading]] 在 Live Preview 中可能可编辑。"
          },
          block: {
            name: "允许块嵌入 (![[file#^id]] / ![[file#^id-id]])",
            desc: "启用后，![[file#^id]] 与 ![[file#^id-id]] 在 Live Preview 中可能可编辑。"
          }
        },

        // Obsidian URI 部分
        obsidianUri: {
          title: "Obsidian URI 链接",
          desc: "链接格式: obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}",
          enableRightClick: {
            name: "在右键菜单中启用 Obsidian URI 链接",
            desc: ""
          },
          enableNotification: {
            name: "复制 URI 链接时显示通知",
            desc: ""
          }
        },

        // 块 ID 部分
        blockId: {
          title: "块 ID",
          desc: "自定义块id",
          maxLength: {
            name: "最大块 ID 长度",
            desc: "设置块 ID 的最大字符数。"
          },
          enablePrefix: {
            name: "自定义 ID 前缀",
            desc: ""
          },
          prefix: {
            name: "块 ID 前缀", 
            desc: "块 ID 将是：前缀-随机字符串"
          }
        },

        // 文件 Outliner（v2）
        fileOutliner: {
          title: "文件级 Outliner（v2）",
          desc: "文件级 Outliner 视图（类 Logseq）。协议尾行使用 Dataview inline fields + `^id`，保证即使不安装插件，`[[file#^id]]` 也能跳转。",
          groups: {
            scope: {
              title: "范围",
            },
            routing: {
              title: "路由",
            },
            display: {
              title: "显示",
            },
            interactions: {
              title: "交互",
            },
            editing: {
              title: "编辑",
            },
            integrations: {
              title: "集成",
            },
            debug: {
              title: "调试",
            },
            behavior: {
              title: "行为",
            },
          },
          enabledFolders: {
            name: "启用文件夹（vault 相对路径）",
            desc: "每项一个路径。位于这些文件夹下的文件将使用 Outliner 视图打开。",
            addButton: "添加文件夹",
            placeholder: "Daily",
          },
          enabledFiles: {
            name: "启用文件（vault 相对路径）",
            desc: "每项一个路径。用于只对少量指定文件启用。",
            addButton: "添加文件",
            placeholder: "Daily/2026-01-09.md",
          },
          frontmatterOverride: {
            name: "Frontmatter 覆盖",
            desc: "每文件：`blp_outliner: true/false`（兼容旧名：`blp_enhanced_list`）。",
          },
          enableRouting: {
            name: "启用 Outliner 路由",
            desc: "启用后，范围内的文件将打开 Outliner 视图，而不是原生 Markdown 编辑器。",
          },
          hideSystemTailLines: {
            name: "隐藏系统尾行",
            desc: "当存在 `[blp_sys:: 1]` 时，在阅读模式隐藏 Outliner 协议尾行。",
          },
          dragAndDrop: {
            name: "启用拖拽移动",
            desc: "拖拽圆点以移动块及其子树。",
          },
          zoom: {
            name: "启用 Zoom",
            desc: "点击圆点以 Zoom 进入块的子树视图。",
          },
          emphasisLine: {
            name: "启用强调线（左侧）",
            desc: "强调当前块左侧的连接线。关闭后保持为弱化颜色。",
          },
          editorContextMenu: {
            enabled: {
              name: "编辑器右键菜单",
              desc: "在 Outliner 编辑模式中使用 BLP 的右键菜单（支持按插件 ID 白名单注入）。",
            },
            allowedPlugins: {
              name: "允许注入的插件 ID",
              desc: "每项一个插件 ID。只有白名单内插件可向 Outliner 编辑菜单添加项。添加 `core` 以包含核心菜单项。",
              addButton: "添加插件",
              placeholder: "metadata-menu",
            },
          },
          listEditor: {
            moveUp: "上移",
            moveDown: "下移",
            remove: "移除",
          },
          childrenOnSplit: {
            name: "Enter 拆分：子块处理",
            desc: "使用 Enter 拆分块时，选择子块保留在原块或移动到新块。",
            options: {
              keep: "子块保留在原块",
              move: "子块移动到新块",
            },
          },
          pasteMultiline: {
            name: "粘贴多行文本",
            desc: "在块内粘贴多行文本时，选择拆分为多个块还是保留为单块多行文本。",
            options: {
              split: "拆分为多个块（默认）",
              multiline: "保留为当前块内多行文本",
            },
          },
          backspaceWithChildren: {
            name: "行首 Backspace（有子块）",
            desc: "当块有子块时，选择 Backspace 与上一块合并（默认）或优先 Outdent。",
            options: {
              merge: "与上一块合并（默认）",
              outdent: "优先 Outdent",
            },
          },
          tasksHelp: {
            name: "任务",
            desc: "任务块在磁盘上使用 Obsidian 原生的 `- [ ]` / `- [x]` 语法。命令：\"${toggleTaskStatus}\"（Mod+Enter）与 \"${toggleTaskMarker}\"（Mod+Shift+Enter）。可在 设置 -> 快捷键 中配置。",
          },
          debug: {
            name: "调试日志",
            desc: "将 Outliner 内部错误输出到 DevTools 控制台。",
          },
          commands: {
            toggleTaskStatus: "Outliner：切换任务状态",
            toggleTaskMarker: "Outliner：切换任务标记",
          },
          contextMenu: {
            copyBlockReference: "复制块引用",
            copyBlockEmbed: "复制块嵌入",
            copyBlockUrl: "复制块 URL",
            convertToTask: "转为任务",
            convertToNormalBlock: "转为普通块",
            copy: "复制",
            cut: "剪切",
            paste: "粘贴",
            pasteAsText: "以纯文本形式粘贴",
            delete: "删除",
            collapse: "折叠",
            expand: "展开",
          },
        },

        // 增强 List Blocks
        enhancedListBlocks: {
          title: "增强 List Blocks",
          desc: "配置增强 List Blocks 的启用范围（blp-view、系统行隐藏、重复 ^id 修复仅在启用文件内生效）。满足任一条件即启用：位于启用文件夹/启用文件列表，或文件 frontmatter 含 `blp_enhanced_list: true`。",
          groups: {
            scopeAndBehavior: {
              title: "启用范围与行为",
            },
            scope: {
              title: "启用范围",
            },
            behavior: {
              title: "行为",
            },
            blockMode: {
              title: "块模式",
            },
            normalization: {
              title: "标准化",
            },
          },
          dataviewStatus: {
            available: "✅ Dataview 插件已安装并启用 (v${version})",
            unavailable: "❌ Dataview 插件未安装或未启用，blp-view 将无法工作。",
          },
          enabledFolders: {
            name: "启用文件夹",
            desc: "每行一个文件夹路径（相对 vault 根目录）。该文件夹下的 Markdown 文件启用。"
          },
          enabledFiles: {
            name: "启用文件",
            desc: "每行一个文件路径（相对 vault 根目录）。这些 Markdown 文件启用。"
          },
          hideSystemLine: {
            name: "隐藏系统行",
            desc: "在 Live Preview 与 Reading mode 下隐藏系统行（`[date:: ...] ^id`）。关闭后显示系统行（用于调试）。"
          },
          hideNativeFoldIndicator: {
            name: "隐藏 Obsidian 自带折叠指示器",
            desc: "在 Live Preview（仅启用文件）中隐藏列表项目旁边的折叠小三角，减少拖拽时误触折叠/展开。"
          },
          subtreeClipboard: {
            name: "启用子树剪贴板（按块树 copy/cut/paste）",
            desc: "当块选择模式激活时，Copy/Cut/Paste 以列表项子树（块树）为单位，而不是纯文本。"
          },
          doubleParenTrigger: {
            name: "启用 `((` 触发块引用插入",
            desc: "开启后，输入 `((` 会打开块引用选择器，并将 `((` 替换为标准 `[[file#^id]]` 引用。不习惯 Roam/Logseq 风格可保持关闭。"
          },
          blockPeek: {
            name: "启用 Block Peek（上下文）",
            desc: "为 `[[file#^id]]` 块提供 Block Peek 入口（手柄菜单 + blp-view peek 按钮）。"
          },
          handleAffordance: {
            name: "显示列表手柄",
            desc: "在 Live Preview 中将无序列表符号渲染为手柄（仅对启用文件生效），便于发现拖拽/折叠等交互。"
          },
          handleActions: {
            name: "启用列表手柄动作",
            desc: "在 Live Preview 中启用无序列表手柄的点击折叠与右键手柄菜单（仅对启用文件生效）。",
            clickAction: {
              name: "手柄左键动作",
              desc: "选择左键点击列表手柄时执行的动作。右键始终打开手柄菜单。",
              options: {
                toggleFolding: "切换折叠",
                selectBlock: "选择块",
                menu: "打开手柄菜单",
                none: "无",
              },
            },
            menu: {
              toggleFolding: "切换折叠",
              copyBlockLink: "复制块链接",
              copyBlockEmbed: "复制块嵌入",
              zoomIn: "放大（Zoom in）",
              zoomOut: "缩小（Zoom out）",
            }
          },
          indentCodeBlocks: {
            name: "缩进嵌套代码块",
            desc: "在 Live Preview 中将列表项内的围栏代码块按层级缩进显示（仅对启用文件生效），不修改文件内容。"
          },
          deleteSubtreeOnDelete: {
            name: "删除列表项时删除子项",
            desc: "开启后：删除父列表项会一并删除其子列表（Logseq/Roam 风格）。关闭后：子项保留，仅删除系统行。"
          },
          normalizeOnSave: {
            name: "保存时标准化列表格式",
            desc: "仅在保存时生效（仅对启用文件）。只对上次保存后你编辑过的列表项应用规则；输入时不改动。",
            rules: {
              tabsToSpaces: {
                name: "将行首 Tab 转为空格",
                desc: "将行首缩进的 Tab 转为空格（tab 宽度可配置）。为避免改变列表层级，当需要时会回退到 Markdown 的 tab 缩进语义。例（tab=2）：`\\t- a` -> `  - a`。",
                tabSize: {
                  name: "Tab 宽度（空格）",
                  desc: "标准化时，把行首 Tab 展开为多少个空格。默认：2。"
                }
              },
              cleanupInvalidSystemLines: {
                name: "清理无效/多余系统行",
                desc: "删除已编辑列表项中的多余系统行（保留第一条），并删除列表项正上方的孤儿系统行。例：`  [date:: ...] ^a` + `  [date:: ...] ^b` -> 仅保留一条。"
              },
              mergeSplitSystemLine: {
                name: "合并拆分的系统行",
                desc: "把两行系统行合并为一行。例：`  [date:: 2026-01-26T16:01:21]` + `  ^7fp1` -> `  [date:: 2026-01-26T16:01:21] ^7fp1`。"
              },
              systemLineIndent: {
                name: "修正系统行缩进",
                desc: "把系统行缩进强制修正为 continuation indent（与 `- ` / 复选框后的内容列对齐）。例：`- a` + `[date:: ...] ^id` -> `- a` + `  [date:: ...] ^id`。"
              },
              ensureSystemLineForTouchedItems: {
                name: "为已编辑的列表项补齐系统行",
                desc: "如果已编辑的列表项缺少系统行，保存时自动插入（必要时移动到子列表之前）。"
              }
            }
          },
          blpView: {
            title: "blp-view（Query/View）",
            desc: "blp-view 执行护栏设置（需要 Dataview）。",
            allowMaterialize: {
              name: "允许 materialize 写回",
              desc: "关闭后，包含 `render.mode: materialize` 的 blp-view 将报错并且不会修改文件。"
            },
            maxSourceFiles: {
              name: "最大扫描文件数",
              desc: "0 表示不限制；如果一次 view 需要扫描超过该数量的文件，将停止执行并提示报错。"
            },
            maxResults: {
              name: "最大输出结果数",
              desc: "0 表示不限制；如果匹配结果超过该数量，将截断输出并提示“已截断”。"
            },
            showDiagnostics: {
              name: "显示 blp-view 诊断信息",
              desc: "在输出下方显示扫描数量、匹配数量与耗时等信息。"
            }
          },
          ops: {
            title: "增强 List Blocks 操作",
            desc: "为 list item 子树提供类似 outliner 的操作与 UI 增强（仅 Live Preview，仅启用文件生效）。",
            zoom: {
              name: "启用 Zoom（Live Preview）",
              desc: "Zoom in/out 到当前 list 子树。与第三方插件 `obsidian-zoom` 冲突，不可同时启用。"
            },
            move: {
              name: "启用子树上移/下移",
              desc: "在当前文件内，将当前 list 子树在兄弟节点之间上移/下移。与 `obsidian-outliner` 冲突。"
            },
            indent: {
              name: "启用子树缩进/反缩进",
              desc: "缩进/反缩进当前 list 子树（可开关）。与 `obsidian-outliner` 冲突。"
            },
            dragDrop: {
              name: "启用拖拽（Drag & Drop）",
              desc: "在当前文件内拖拽 list 子树进行排序/改变层级（不支持跨文件）。与 `obsidian-outliner` 冲突。"
            },
            verticalLines: {
              name: "启用垂直缩进线",
              desc: "在 Live Preview 下渲染缩进导引线（受主题影响，best-effort）。与 `obsidian-outliner` 冲突。"
            },
            bulletThreading: {
              name: "启用 Bullet Threading",
              desc: "高亮当前 list block 及其祖先路径（active path）。与 `obsidian-outliner` 冲突。"
            }
          }
        },
      },

      // 命令翻译
      commands: {
        // Flow 命令
        h1: "标题 1",
        h2: "标题 2", 
        h3: "标题 3",
        h4: "标题 4",
        h5: "标题 5",
        h6: "标题 6",
        bold: "粗体",
        italic: "斜体",
        strikethrough: "删除线",
        highlight: "高亮",
        code: "代码",
        codeblock: "代码块",
        quote: "引用",
        link: "链接",
        image: "图片",
        table: "表格",
        divider: "分隔线",
        embed: "嵌入",
        tag: "标签",
        callout: "标注",
        list: "列表",
        numberList: "数字列表",
        task: "任务",
        toggleList: "折叠列表",
        space: "空格",
        newNote: "新建笔记",
        newFolder: "新建文件夹",
      },

      // 命令建议
      commandsSuggest: {
        noResult: "未找到结果",
      },

      // 元数据类型
      metadataTypes: {
        fileName: "文件名",
        path: "路径",
        folder: "文件夹",
        created: "创建时间",
        lastModified: "最后修改",
        extension: "扩展名",
        size: "大小",
        tags: "标签",
        inlinks: "反向链接",
        outlinks: "正向链接",
        color: "颜色",
      },

      // 更新说明弹窗（升级后展示一次）
      whatsNew: {
        titleWithVersion: "Block Link Plus — v${1} 更新内容",
        updatedFromTo: "已从 v${1} 更新到 v${2}",
        viewChangelog: "查看完整更新日志",
        close: "关闭",
        v1_8_0: [
          "内联编辑：迁移到原生 leaf 引擎（移植自 sync-embeds，Live Preview 更稳定）。",
          "移除旧版 `!![[...]]` 语法，请改用 `![[...]]`。",
          "多行块：改进 `^id-id` 范围创建（安全时行尾插入；否则在块结束后独占行插入）。",
          "修复：选区在单个列表项内时，范围 marker 不再扩到整个 list。",
          "修复：多块模式按“块”（段落/列表项）工作；列表项有续行时，ID 插入到该项最后一行（#22/#27）。",
          "`^id-id` 范围嵌入渲染一致（即使关闭内联编辑）。",
          "修复：阅读模式后处理不再导致内容被清空（#29）。",
          "新增：升级后弹出一次更新说明（What's New）。",
        ],
        fallback: [
          "请查看完整更新日志了解详情。",
        ],
      },

      // Notices
      notices: {
        fileOutlinerUnsupportedBlockMarkdown: "此块包含列表/标题语法。为保持 Outliner 结构，将其按纯文本渲染。",
      }
    },
    "zh-TW": {
      // Flow Editor buttons - 流程編輯器按鈕文字
      buttons: {
        openFlow: "開啟流程",
        hideFlow: "隱藏流程", 
        toggleFlow: "切換流程",
        // 表格相關按鈕
        cutTable: "剪下表格",
        deleteTable: "刪除表格",
      },

      // 標籤文字
      labels: {
        noFile: "未找到",
        placeholder: "輸入 ${1} 開啟流程選單",
        notePlaceholder: "點擊建立新筆記",
      },

      // 命令面板條目
      commandPalette: {
        openFlow: "開啟流程編輯器",
        closeFlow: "關閉流程編輯器",
      },

      // 通知訊息
      notice: {
        tableDeleted: "表格已刪除",
      },

      // 設定面板文字
      settings: {
        // 插件標題
        pluginTitle: "Block Link Plus",

        // 多行行為
        multiLineHandle: {
          name: "多行塊行為",
          desc: "定義多行選擇如何產生區塊 ID。'預設' 將它們視為單行處理。",
          options: {
            default: "預設",
            addHeading: "新增新標題", 
            addMultiBlock: "新增多區塊",
            addMultilineBlock: "新增多行塊"
          },
          descriptions: {
            default: "將多行選擇視為單一區塊。在選擇結尾處創建一個區塊 ID ^abc123。",
            addHeading: "在選擇上方新增一個新標題。為組織創建一個帶區塊 ID 的標題。",
            addMultiBlock: "為每個區塊（段落、清單項等）創建單獨的區塊 ID。每個區塊獲得自己的 ^abc123 識別符。",
            addMultilineBlock: "創建一個 ^abc123-abc123 格式的範圍區塊。用 ^abc123 標記第一行，並在最后一行後添加 ^abc123-abc123 以精確引用多行。"
          }
        },

        // 區塊連結部分
        blockLink: {
          title: "塊連結",
          desc: "連結格式：[[檔案#區塊_id]]",
          enableRightClick: {
            name: "在右鍵選單中啟用塊連結",
            desc: ""
          },
          enableNotification: {
            name: "複製塊連結時顯示通知",
            desc: ""
          },
          aliasStyle: {
            name: "別名樣式",
            desc: "選擇如何為塊連結產生別名. 對於標題塊, 除非選擇'無別名', 否則別名始終是標題文字.",
            options: {
              noAlias: "無別名",
              firstChars: "前 X 個字元", 
              parentHeading: "父標題",
              selectedText: "選中文字"
            },
            descriptions: {
              noAlias: "連結將顯示為 [[檔案#^abc123]] 沒有別名文字。",
              firstChars: "連結將使用塊內容的第一個 X 個字元作為別名：[[檔案#^abc123|前幾個詞...]]",
              parentHeading: "連結將使用最近的父標題作為別名：[[檔案#^abc123|父標題]]",
              selectedText: "連結將使用選中的文字作為別名：[[檔案#^abc123|您選中的文字]]"
            }
          },
          aliasLength: {
            name: "別名長度",
            desc: "設定別名的長度(1-100). 僅在別名樣式為'前 X 個字元'時使用.",
          },
          headingIdNewline: {
            name: "實驗性：標題區塊 ID 樣式",
            desc: "僅選擇單個標題行時，將區塊 ID 放在新行中"
          }
        },

        // 嵌入連結部分
        embedLink: {
          title: "嵌入連結",
          desc: "連結格式：![[檔案#區塊_id]]",
          enableRightClick: {
            name: "在右鍵選單中啟用嵌入連結",
            desc: ""
          },
          enableNotification: {
            name: "複製嵌入連結時顯示通知", 
            desc: ""
          }
        },

        // Inline edit
        inlineEdit: {
          title: "內聯編輯",
          desc: "控制 Live Preview 下哪些 ![[...]] 嵌入允許就地編輯。",
          enable: {
            name: "啟用內聯編輯",
            desc: "啟用後，支援的 ![[...]] 嵌入在 Live Preview 中可能可編輯。"
          },
          file: {
            name: "允許檔案嵌入 (![[file]])",
            desc: "啟用後，![[file]] 在 Live Preview 中可能可編輯。"
          },
          heading: {
            name: "允許標題嵌入 (![[file#Heading]])",
            desc: "啟用後，![[file#Heading]] 在 Live Preview 中可能可編輯。"
          },
          block: {
            name: "允許區塊嵌入 (![[file#^id]] / ![[file#^id-id]])",
            desc: "啟用後，![[file#^id]] 與 ![[file#^id-id]] 在 Live Preview 中可能可編輯。"
          }
        },

        // Obsidian URI 部分
        obsidianUri: {
          title: "Obsidian URI 連結",
          desc: "連結格式: obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}",
          enableRightClick: {
            name: "在右鍵選單中啟用 Obsidian URI 連結",
            desc: ""
          },
          enableNotification: {
            name: "複製 URI 連結時顯示通知",
            desc: ""
          }
        },

        // 區塊 ID 部分
        blockId: {
          title: "區塊 ID",
          desc: "自訂區塊_id",
          maxLength: {
            name: "最大區塊 ID 長度",
            desc: "設定區塊 ID 的最大字元數。"
          },
          enablePrefix: {
            name: "自訂 ID 前綴",
            desc: ""
          },
          prefix: {
            name: "區塊 ID 前綴", 
            desc: "區塊 ID 將是：前綴-隨機字串"
          }
        },

        // 檔案 Outliner（v2）
        fileOutliner: {
          title: "檔案級 Outliner（v2）",
          desc: "檔案級 Outliner 檢視（類 Logseq）。協議尾行使用 Dataview inline fields + `^id`，確保即使不安裝插件，`[[file#^id]]` 也能跳轉。",
          groups: {
            scope: {
              title: "範圍",
            },
            routing: {
              title: "路由",
            },
            display: {
              title: "顯示",
            },
            interactions: {
              title: "互動",
            },
            editing: {
              title: "編輯",
            },
            integrations: {
              title: "整合",
            },
            debug: {
              title: "除錯",
            },
            behavior: {
              title: "行為",
            },
          },
          enabledFolders: {
            name: "啟用資料夾（vault 相對路徑）",
            desc: "每項一個路徑。位於這些資料夾下的檔案將以 Outliner 檢視開啟。",
            addButton: "新增資料夾",
            placeholder: "Daily",
          },
          enabledFiles: {
            name: "啟用檔案（vault 相對路徑）",
            desc: "每項一個路徑。用於只對少量指定檔案啟用。",
            addButton: "新增檔案",
            placeholder: "Daily/2026-01-09.md",
          },
          frontmatterOverride: {
            name: "Frontmatter 覆蓋",
            desc: "每檔案：`blp_outliner: true/false`（相容舊名：`blp_enhanced_list`）。",
          },
          enableRouting: {
            name: "啟用 Outliner 路由",
            desc: "啟用後，範圍內的檔案會開啟 Outliner 檢視，而不是原生 Markdown 編輯器。",
          },
          hideSystemTailLines: {
            name: "隱藏系統尾行",
            desc: "當存在 `[blp_sys:: 1]` 時，在閱讀模式隱藏 Outliner 協議尾行。",
          },
          dragAndDrop: {
            name: "啟用拖曳移動",
            desc: "拖曳圓點以移動區塊及其子樹。",
          },
          zoom: {
            name: "啟用 Zoom",
            desc: "點擊圓點以 Zoom 進入區塊的子樹檢視。",
          },
          emphasisLine: {
            name: "啟用強調線（左側）",
            desc: "強調目前區塊左側的連接線。關閉後保持為弱化顏色。",
          },
          editorContextMenu: {
            enabled: {
              name: "編輯器右鍵選單",
              desc: "在 Outliner 編輯模式中使用 BLP 的右鍵選單（支援按外掛 ID 白名單注入）。",
            },
            allowedPlugins: {
              name: "允許注入的外掛 ID",
              desc: "每項一個外掛 ID。只有白名單內外掛可向 Outliner 編輯選單新增項目。加入 `core` 以包含核心選單項目。",
              addButton: "新增外掛",
              placeholder: "metadata-menu",
            },
          },
          listEditor: {
            moveUp: "上移",
            moveDown: "下移",
            remove: "移除",
          },
          childrenOnSplit: {
            name: "Enter 拆分：子塊處理",
            desc: "使用 Enter 拆分區塊時，選擇子塊保留在原區塊或移動到新區塊。",
            options: {
              keep: "子塊保留在原區塊",
              move: "子塊移動到新區塊",
            },
          },
          pasteMultiline: {
            name: "貼上多行文字",
            desc: "在區塊內貼上多行文字時，選擇拆分為多個區塊或保留為單區塊多行文字。",
            options: {
              split: "拆分為多個區塊（預設）",
              multiline: "保留為目前區塊內多行文字",
            },
          },
          backspaceWithChildren: {
            name: "行首 Backspace（有子塊）",
            desc: "當區塊有子塊時，選擇 Backspace 與上一區塊合併（預設）或優先 Outdent。",
            options: {
              merge: "與上一區塊合併（預設）",
              outdent: "優先 Outdent",
            },
          },
          tasksHelp: {
            name: "任務",
            desc: "任務區塊在磁碟上使用 Obsidian 原生的 `- [ ]` / `- [x]` 語法。命令：\"${toggleTaskStatus}\"（Mod+Enter）與 \"${toggleTaskMarker}\"（Mod+Shift+Enter）。可在 設定 -> 快捷鍵 中設定。",
          },
          debug: {
            name: "除錯記錄",
            desc: "將 Outliner 內部錯誤輸出到 DevTools 主控台。",
          },
          commands: {
            toggleTaskStatus: "Outliner：切換任務狀態",
            toggleTaskMarker: "Outliner：切換任務標記",
          },
          contextMenu: {
            copyBlockReference: "複製區塊引用",
            copyBlockEmbed: "複製區塊嵌入",
            copyBlockUrl: "複製區塊 URL",
            convertToTask: "轉為任務",
            convertToNormalBlock: "轉為一般區塊",
            copy: "複製",
            cut: "剪下",
            paste: "貼上",
            pasteAsText: "以純文字貼上",
            delete: "刪除",
            collapse: "摺疊",
            expand: "展開",
          },
        },

        // 增強 List Blocks
        enhancedListBlocks: {
          title: "增強 List Blocks",
          desc: "設定增強 List Blocks 的啟用範圍（blp-view、系統行隱藏、重複 ^id 修復僅在啟用檔案內生效）。滿足任一條件即啟用：位於啟用資料夾/啟用檔案清單，或檔案 frontmatter 含 `blp_enhanced_list: true`。",
          groups: {
            scopeAndBehavior: {
              title: "啟用範圍與行為",
            },
            scope: {
              title: "啟用範圍",
            },
            behavior: {
              title: "行為",
            },
            blockMode: {
              title: "區塊模式",
            },
            normalization: {
              title: "標準化",
            },
          },
          dataviewStatus: {
            available: "✅ Dataview 插件已安裝並啟用(版本 ${version})",
            unavailable: "❌ Dataview 插件未安裝或未啟用，blp-view 將無法運作。",
          },
          enabledFolders: {
            name: "啟用資料夾",
            desc: "每行一個資料夾路徑（相對 vault 根目錄）。該資料夾下的 Markdown 檔案啟用。"
          },
          enabledFiles: {
            name: "啟用檔案",
            desc: "每行一個檔案路徑（相對 vault 根目錄）。這些 Markdown 檔案啟用。"
          },
          hideSystemLine: {
            name: "隱藏系統行",
            desc: "在 Live Preview 與 Reading mode 下隱藏系統行（`[date:: ...] ^id`）。關閉後顯示系統行（用於除錯）。"
          },
          hideNativeFoldIndicator: {
            name: "隱藏 Obsidian 內建折疊指示器",
            desc: "在 Live Preview（僅啟用檔案）中隱藏列表項目旁的折疊小三角，降低拖曳時誤觸折疊/展開。"
          },
          subtreeClipboard: {
            name: "啟用子樹剪貼簿（以區塊樹 copy/cut/paste）",
            desc: "當區塊選擇模式啟用時，Copy/Cut/Paste 以列表項子樹（區塊樹語意）為單位，而非純文字。"
          },
          doubleParenTrigger: {
            name: "啟用 `((` 觸發區塊引用插入",
            desc: "啟用後，輸入 `((` 會開啟區塊引用選擇器，並將 `((` 替換為標準 `[[file#^id]]` 引用。不習慣 Roam/Logseq 風格可保持關閉。"
          },
          blockPeek: {
            name: "啟用 Block Peek（上下文）",
            desc: "為 `[[file#^id]]` 區塊提供 Block Peek 入口（把手選單 + blp-view peek 按鈕）。"
          },
          handleAffordance: {
            name: "顯示列表把手",
            desc: "在 Live Preview 中將無序列表符號渲染為把手（僅對啟用檔案生效），方便發現拖曳/折疊等互動。"
          },
          handleActions: {
            name: "啟用列表把手動作",
            desc: "在 Live Preview 中啟用無序清單把手的點擊折疊與右鍵把手選單（僅對啟用檔案生效）。",
            clickAction: {
              name: "把手左鍵動作",
              desc: "選擇左鍵點擊列表把手時執行的動作。右鍵一律開啟把手選單。",
              options: {
                toggleFolding: "切換折疊",
                selectBlock: "選擇區塊",
                menu: "開啟把手選單",
                none: "無",
              },
            },
            menu: {
              toggleFolding: "切換折疊",
              copyBlockLink: "複製區塊連結",
              copyBlockEmbed: "複製區塊嵌入",
              zoomIn: "放大（Zoom in）",
              zoomOut: "縮小（Zoom out）",
            }
          },
          indentCodeBlocks: {
            name: "縮進巢狀程式碼區塊",
            desc: "在 Live Preview 中將清單項內的圍欄程式碼區塊依層級縮進顯示（僅對啟用檔案生效），不修改檔案內容。"
          },
          deleteSubtreeOnDelete: {
            name: "刪除列表項時刪除子項",
            desc: "開啟後：刪除父列表項會一併刪除其子列表（Logseq/Roam 風格）。關閉後：子項保留，僅刪除系統行。"
          },
          normalizeOnSave: {
            name: "儲存時標準化清單格式",
            desc: "僅在儲存時生效（僅對啟用檔案）。只對上次儲存後你編輯過的清單項套用規則；輸入時不改動。",
            rules: {
              tabsToSpaces: {
                name: "將行首 Tab 轉為空格",
                desc: "將行首縮排的 Tab 轉為空格（tab 寬度可設定）。為避免改變列表層級，必要時會回退到 Markdown 的 tab 縮排語義。例（tab=2）：`\\t- a` -> `  - a`。",
                tabSize: {
                  name: "Tab 寬度（空格）",
                  desc: "標準化時，將行首 Tab 展開為多少個空格。預設：2。"
                }
              },
              cleanupInvalidSystemLines: {
                name: "清理無效/多餘系統行",
                desc: "刪除已編輯清單項中的多餘系統行（保留第一條），並刪除清單項正上方的孤兒系統行。例：`  [date:: ...] ^a` + `  [date:: ...] ^b` -> 僅保留一條。"
              },
              mergeSplitSystemLine: {
                name: "合併拆分的系統行",
                desc: "把兩行系統行合併為一行。例：`  [date:: 2026-01-26T16:01:21]` + `  ^7fp1` -> `  [date:: 2026-01-26T16:01:21] ^7fp1`。"
              },
              systemLineIndent: {
                name: "修正系統行縮排",
                desc: "把系統行縮排強制修正為 continuation indent（與 `- ` / 核取方塊後的內容欄對齊）。例：`- a` + `[date:: ...] ^id` -> `- a` + `  [date:: ...] ^id`。"
              },
              ensureSystemLineForTouchedItems: {
                name: "為已編輯的清單項補齊系統行",
                desc: "若已編輯的清單項缺少系統行，儲存時自動插入（必要時移動到子清單之前）。"
              }
            }
          },
          blpView: {
            title: "blp-view（Query/View）",
            desc: "blp-view 執行護欄設定（需要 Dataview）。",
            allowMaterialize: {
              name: "允許 materialize 寫回",
              desc: "關閉後，包含 `render.mode: materialize` 的 blp-view 將報錯且不會修改檔案。"
            },
            maxSourceFiles: {
              name: "最大掃描檔案數",
              desc: "0 表示不限制；若一次 view 需要掃描超過此數量的檔案，將停止執行並提示錯誤。"
            },
            maxResults: {
              name: "最大輸出結果數",
              desc: "0 表示不限制；若匹配結果超過此數量，將截斷輸出並提示「已截斷」。"
            },
            showDiagnostics: {
              name: "顯示 blp-view 診斷資訊",
              desc: "在輸出下方顯示掃描數量、匹配數量與耗時等資訊。"
            }
          },
          ops: {
            title: "增強 List Blocks 操作",
            desc: "為 list item 子樹提供類似 outliner 的操作與 UI 增強（僅 Live Preview，僅啟用檔案生效）。",
            zoom: {
              name: "啟用 Zoom（Live Preview）",
              desc: "Zoom in/out 到當前 list 子樹。與第三方插件 `obsidian-zoom` 衝突，不可同時啟用。"
            },
            move: {
              name: "啟用子樹上移/下移",
              desc: "在當前檔案內，將當前 list 子樹在兄弟節點之間上移/下移。與 `obsidian-outliner` 衝突。"
            },
            indent: {
              name: "啟用子樹縮排/反縮排",
              desc: "縮排/反縮排當前 list 子樹（可開關）。與 `obsidian-outliner` 衝突。"
            },
            dragDrop: {
              name: "啟用拖曳（Drag & Drop）",
              desc: "在當前檔案內拖曳 list 子樹進行排序/改變層級（不支援跨檔案）。與 `obsidian-outliner` 衝突。"
            },
            verticalLines: {
              name: "啟用垂直縮排線",
              desc: "在 Live Preview 下渲染縮排導引線（受主題影響，best-effort）。與 `obsidian-outliner` 衝突。"
            },
            bulletThreading: {
              name: "啟用 Bullet Threading",
              desc: "高亮當前 list block 及其祖先路徑（active path）。與 `obsidian-outliner` 衝突。"
            }
          }
        },
      },

      // 命令翻譯
      commands: {
        // Flow 命令
        h1: "標題 1",
        h2: "標題 2", 
        h3: "標題 3",
        h4: "標題 4",
        h5: "標題 5",
        h6: "標題 6",
        bold: "粗體",
        italic: "斜體",
        strikethrough: "刪除線",
        highlight: "螢光標示",
        code: "程式碼",
        codeblock: "程式碼區塊",
        quote: "引用",
        link: "連結",
        image: "圖片",
        table: "表格",
        divider: "分隔線",
        embed: "嵌入",
        tag: "標籤",
        callout: "標註",
        list: "清單",
        numberList: "數字清單",
        task: "任務",
        toggleList: "摺疊清單",
        space: "空格",
        newNote: "新建筆記",
        newFolder: "新建資料夾",
      },

      // 命令建議
      commandsSuggest: {
        noResult: "未找到結果",
      },

      // 元資料類型
      metadataTypes: {
        fileName: "檔案名稱",
        path: "路徑", 
        folder: "資料夾",
        created: "建立時間",
        lastModified: "最後修改",
        extension: "副檔名",
        size: "大小",
        tags: "標籤",
        inlinks: "反向連結", 
        outlinks: "正向連結",
        color: "顏色",
      },

      // 更新說明彈窗（升級後展示一次）
      whatsNew: {
        titleWithVersion: "Block Link Plus — v${1} 更新內容",
        updatedFromTo: "已從 v${1} 更新到 v${2}",
        viewChangelog: "查看完整更新日誌",
        close: "關閉",
        v1_8_0: [
          "內嵌編輯：遷移到原生 leaf 引擎（移植自 sync-embeds，Live Preview 更穩定）。",
          "移除舊版 `!![[...]]` 語法，請改用 `![[...]]`。",
          "多行塊：改進 `^id-id` 範圍建立（安全時行尾內嵌插入；否則在塊結束後以獨佔行插入）。",
          "修正：選區在單個清單項內時，範圍 marker 不再擴到整個 list。",
          "修正：多塊模式以「塊」（段落/清單項）為單位；清單項有續行時，ID 會插在該項最後一行（#22/#27）。",
          "`^id-id` 範圍嵌入渲染一致（即使關閉內嵌編輯）。",
          "修正：閱讀模式後處理不再導致內容被清空（#29）。",
          "新增：升級後彈出一次更新說明（What's New）。",
        ],
        fallback: [
          "請查看完整更新日誌了解詳情。",
        ],
      },

      // Notices
      notices: {
        fileOutlinerUnsupportedBlockMarkdown: "此區塊包含列表/標題語法。為保持 Outliner 結構，將其以純文字渲染。",
      }
    },
  };

  private ensureFileOutlinerPaneMenuStrings(): void {
    const en = (this.all as any)?.en?.settings?.fileOutliner;
    if (en) {
      en.paneMenu ??= {
        openAsMarkdown: "Open as Markdown (source)",
        openAsMarkdownNewTab: "Open as Markdown (new tab)",
        openAsOutliner: "Open as Outliner",
        openAsOutlinerNewTab: "Open as Outliner (new tab)",
      };
    }

    const zh = (this.all as any)?.zh?.settings?.fileOutliner;
    if (zh) {
      zh.paneMenu ??= {
        openAsMarkdown: "打开为 Markdown（源码）",
        openAsMarkdownNewTab: "打开为 Markdown（新标签页）",
        openAsOutliner: "打开为 Outliner",
        openAsOutlinerNewTab: "打开为 Outliner（新标签页）",
      };
    }

    const zhTw = (this.all as any)?.["zh-TW"]?.settings?.fileOutliner;
    if (zhTw) {
      zhTw.paneMenu ??= {
        openAsMarkdown: "以 Markdown（原始碼）開啟",
        openAsMarkdownNewTab: "以 Markdown（新分頁）開啟",
        openAsOutliner: "以 Outliner 開啟",
        openAsOutlinerNewTab: "以 Outliner（新分頁）開啟",
      };
    }
  }

  constructor() {
    this.lang = "en";
    this.ensureFileOutlinerPaneMenuStrings();
    
    // Prefer Obsidian's stored language; fall back to moment locale.
    const rawLang = window.localStorage.getItem("language") || moment.locale() || "";
    const lower = String(rawLang).trim().toLowerCase();

    const isZhTw =
      lower === "zh-tw" ||
      lower === "zh_tw" ||
      lower.startsWith("zh-tw") ||
      lower.startsWith("zh_tw") ||
      lower.startsWith("zh-hant") ||
      lower.startsWith("zh-hk") ||
      lower.startsWith("zh-mo");

    const isZh =
      lower === "zh" ||
      lower === "zh-cn" ||
      lower === "zh_cn" ||
      lower.startsWith("zh-cn") ||
      lower.startsWith("zh_cn") ||
      lower.startsWith("zh-hans");

    if (isZhTw) this.lang = "zh-TW";
    else if (isZh) this.lang = "zh";
    else this.lang = "en";
  }

  get texts(): typeof this.all.en {
    return this.all[this.lang] || this.all.en;
  }

  get commandPalette() {
    return this.all[this.lang]?.commandPalette || this.all.en.commandPalette;
  }

  get settings() {
    return this.all[this.lang]?.settings || this.all.en.settings;
  }

  get commands() {
    return this.all[this.lang]?.commands || this.all.en.commands;
  }

  get buttons() {
    return this.all[this.lang]?.buttons || this.all.en.buttons;
  }

  get labels() {
    return this.all[this.lang]?.labels || this.all.en.labels;
  }

  get notice() {
    return this.all[this.lang]?.notice || this.all.en.notice;
  }

  get whatsNew() {
    return this.all[this.lang]?.whatsNew || this.all.en.whatsNew;
  }

  get notices() {
    return this.all[this.lang]?.notices || this.all.en.notices;
  }
}

const i18n = new T();
export default i18n;
