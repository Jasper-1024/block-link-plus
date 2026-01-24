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

        // Time section
        timeSection: {
          title: "Time Block",
          desc: "Insert time-based headings",
          enable: {
            name: "Enable time block feature",
            desc: ""
          },
          enableInMenu: {
            name: "Show in context menu",
            desc: "If enabled, adds time block option to the right-click menu"
          },
          timeFormat: {
            name: "Time format",
            desc: "Format for the time block (HH:mm = 24-hour format)"
          },
          titlePattern: {
            name: "Title recognition pattern",
            desc: "Regular expression pattern to recognize time headings (default: \\d{1,2}:\\d{1,2} for HH:mm format)"
          },
          insertAsHeading: {
            name: "Insert as heading",
            desc: "If enabled, inserts time with heading marks (#), otherwise inserts just the time"
          },
          plainStyle: {
            name: "Plain text style in preview",
            desc: "If enabled, time blocks will appear as plain text in preview mode, even when inserted as headings"
          },
          dailyNotePattern: {
            name: "Daily note pattern",
            desc: "Regular expression to identify daily note filenames (default: YYYY-MM-DD)"
          },
          headingLevel: {
            name: "Daily note heading level",
            desc: "Heading level to use in daily notes (1-6, corresponds to #-######)"
          }
        },

        // Timeline section
        timeline: {
          title: "Timeline Feature",
          desc: "Settings for the blp-timeline code block functionality",
          dataviewStatus: {
            available: "✅ Dataview plugin is installed and enabled (v${version})",
            unavailable: "❌ Dataview plugin is not installed or not enabled. Timeline feature will not work."
          },
          enable: {
            name: "Enable Timeline feature",
            desc: "Enable the blp-timeline code block functionality. Requires Dataview plugin."
          },
          defaultHeadingLevel: {
            name: "Default heading level",
            desc: "Default heading level to use for timeline sections (1-6). Can be overridden in code block."
          },
          defaultSortOrder: {
            name: "Default sort order", 
            desc: "Default sort order for timeline entries. Can be overridden in code block.",
            options: {
              ascending: "Ascending (oldest first)",
              descending: "Descending (newest first)"
            }
          }
        },

        // Enhanced List Blocks section
        enhancedListBlocks: {
          title: "Enhanced List Blocks",
          desc: "Opt-in scope for Enhanced List Blocks features (blp-view, system line hiding, duplicate ^id repair). A file is enabled if it matches any enabled folder/file below, or has frontmatter `blp_enhanced_list: true`.",
          enabledFolders: {
            name: "Enabled folders",
            desc: "One folder path per line (vault-relative). Markdown files under these folders are enabled."
          },
          enabledFiles: {
            name: "Enabled files",
            desc: "One file path per line (vault-relative). These Markdown files are enabled."
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
        timelineRequiresDataview: "Block Link Plus: Timeline feature requires Dataview plugin. Please install and enable Dataview plugin.",
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

        // 时间
        timeSection: {
          title: "时间区块",
          desc: "插入基于时间的标题",
          enable: {
            name: "启用时间区块功能",
            desc: ""
          },
          enableInMenu: {
            name: "在上下文菜单中显示",
            desc: "如果启用，将在右键菜单中添加时间区块选项"
          },
          timeFormat: {
            name: "时间格式",
            desc: "时间区块标题的格式(HH:mm = 24小时格式)"
          },
          titlePattern: {
            name: "标题识别模式",
            desc: "用于识别时间标题的正则表达式模式(默认: \\d{1,2}:\\d{1,2} for HH:mm格式)"
          },
          insertAsHeading: {
            name: "作为标题插入",
            desc: "如果启用，使用标题标记（#）插入时间，否则只插入时间"
          },
          plainStyle: {
            name: "预览中的纯文本样式",
            desc: "如果启用，时间区块在预览模式中将显示为纯文本，即使作为标题插入"
          },
          dailyNotePattern: {
            name: "日记模式",
            desc: "用于识别日记文件名的正则表达式(默认: YYYY-MM-DD)"
          },
          headingLevel: {
            name: "日记标题级别",
            desc: "在日记中使用的标题级别(1-6, 对应 #-######)"
          }
        },

        // 时间轴部分
        timeline: {
          title: "时间线功能",
          desc: "blp-timeline 代码块功能的设置",
          dataviewStatus: {
            available: "✅ Dataview 插件已安装并启用 (v${version})",
            unavailable: "❌ Dataview 插件未安装或未启用, 时间线功能将无法工作."
          },
          enable: {
            name: "启用时间线功能",
            desc: "启用 blp-timeline 代码块功能。需要 Dataview 插件。"
          },
          defaultHeadingLevel: {
            name: "默认标题级别",
            desc: "时间线部分使用的默认标题级别(1-6). 可在代码块中覆盖."
          },
          defaultSortOrder: {
            name: "默认排序顺序", 
            desc: "时间线条目的默认排序顺序. 可在代码块中覆盖.",
            options: {
              ascending: "升序(最旧的在前)",
              descending: "降序(最新的在前)"
            }
          }
        },

        // 增强 List Blocks
        enhancedListBlocks: {
          title: "增强 List Blocks",
          desc: "配置增强 List Blocks 的启用范围（blp-view、系统行隐藏、重复 ^id 修复仅在启用文件内生效）。满足任一条件即启用：位于启用文件夹/启用文件列表，或文件 frontmatter 含 `blp_enhanced_list: true`。",
          enabledFolders: {
            name: "启用文件夹",
            desc: "每行一个文件夹路径（相对 vault 根目录）。该文件夹下的 Markdown 文件启用。"
          },
          enabledFiles: {
            name: "启用文件",
            desc: "每行一个文件路径（相对 vault 根目录）。这些 Markdown 文件启用。"
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
        timelineRequiresDataview: "Block Link Plus: 时间轴功能需要 Dataview 插件。请安装并启用 Dataview 插件。",
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

        // 時間部分
        timeSection: {
          title: "時間區塊",
          desc: "插入基於時間的標題",
          enable: {
            name: "啟用時間區塊功能",
            desc: ""
          },
          enableInMenu: {
            name: "在上下文選單中顯示",
            desc: "如果啟用，將在右鍵選單中新增時間區塊選項"
          },
          timeFormat: {
            name: "時間格式",
            desc: "時間區塊的格式(HH:mm = 24小時格式)"
          },
          titlePattern: {
            name: "標題識別模式",
            desc: "用於識別時間標題的正則表達式模式(預設: \\d{1,2}:\\d{1,2} for HH:mm格式)"
          },
          insertAsHeading: {
            name: "作為標題插入",
            desc: "如果啟用，使用標題標記（#）插入時間，否則只插入時間"
          },
          plainStyle: {
            name: "預覽中的純文字樣式",
            desc: "如果啟用，時間區塊在預覽模式中將顯示為純文字，即使作為標題插入"
          },
          dailyNotePattern: {
            name: "日記模式",
            desc: "用於識別日記檔案名稱的正規表達式(預設: YYYY-MM-DD)"
          },
          headingLevel: {
            name: "日記標題級別",
            desc: "在日記中使用的標題級別(1-6, 對應 #-######)"
          }
        },

        // 時間軸部分
        timeline: {
          title: "時間軸功能",
          desc: "blp-timeline 程式碼區塊功能的設定",
          dataviewStatus: {
            available: "✅ Dataview 插件已安裝並啟用(版本 ${version})",
            unavailable: "❌ Dataview 插件未安裝或未啟用. 時間軸功能將無法運作."
          },
          enable: {
            name: "啟用時間軸功能",
            desc: "啟用 blp-timeline 程式碼區塊功能. 需要 Dataview 插件."
          },
          defaultHeadingLevel: {
            name: "預設標題級別",
            desc: "時間軸部分使用的預設標題級別(1-6). 可在程式碼區塊中覆蓋."
          },
          defaultSortOrder: {
            name: "預設排序順序", 
            desc: "時間軸條目的預設排序順序. 可在程式碼區塊中覆蓋.",
            options: {
              ascending: "升序(最舊的在前)",
              descending: "降序(最新的在前)"
            }
          }
        },

        // 增強 List Blocks
        enhancedListBlocks: {
          title: "增強 List Blocks",
          desc: "設定增強 List Blocks 的啟用範圍（blp-view、系統行隱藏、重複 ^id 修復僅在啟用檔案內生效）。滿足任一條件即啟用：位於啟用資料夾/啟用檔案清單，或檔案 frontmatter 含 `blp_enhanced_list: true`。",
          enabledFolders: {
            name: "啟用資料夾",
            desc: "每行一個資料夾路徑（相對 vault 根目錄）。該資料夾下的 Markdown 檔案啟用。"
          },
          enabledFiles: {
            name: "啟用檔案",
            desc: "每行一個檔案路徑（相對 vault 根目錄）。這些 Markdown 檔案啟用。"
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
        timelineRequiresDataview: "Block Link Plus: 時間軸功能需要 Dataview 插件。請安裝並啟用 Dataview 插件。",
      }
    },
  };

  constructor() {
    this.lang = "en";
    
    // Use Obsidian's native language detection
    const obsidianLang = window.localStorage.getItem('language');
    
    if (obsidianLang === 'zh') {
      this.lang = 'zh';
    } else if (obsidianLang === 'zh-TW') {
      this.lang = 'zh-TW';
    } else if (obsidianLang === null || obsidianLang === 'en') {
      this.lang = 'en';
    }
    // For any other language, fall back to English
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
