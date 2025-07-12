export default {
	flow: {
		edit: "编辑",
		open: "打开",
		hover: "悬停编辑"
	},
	commandPalette: {
		openFlow: "打开流程编辑器",
		closeFlow: "关闭流程编辑器"
	},
	settings: {
		// 插件标题
		pluginTitle: "Block Link Plus",

		// 多行块行为
		multiLineHandle: {
			name: "多行块行为",
			desc: "定义多行选择如何生成块ID",
			options: {
				default: "默认",
				addHeading: "添加新标题",
				addMultiBlock: "添加多个块",
				addMultilineBlock: "添加多行块"
			},
			descriptions: {
				default: "将多行选择视为单个块，在选择末尾创建一个块ID ^abc123",
				addHeading: "在选择上方添加新标题，创建带有块ID的标题以便组织",
				addMultiBlock: "为每行创建单独的块ID，每行都有自己的 ^abc123 标识符",
				addMultilineBlock: "创建 ^abc123-abc123 格式的范围块，在第一行标记 ^abc123，在最后一行后添加 ^abc123-abc123 以进行精确的多行引用"
			}
		},

		// 块链接部分
		blockLink: {
			title: "块链接",
			desc: "链接格式：[[文件#块ID]]",
			enableRightClick: {
				name: "在右键菜单中启用块链接"
			},
			enableNotification: {
				name: "复制块链接时显示通知"
			},
			aliasStyle: {
				name: "别名样式",
				desc: "选择如何为块链接生成别名。对于标题块，除非选择"无别名"，否则别名始终是标题文本",
				options: {
					noAlias: "无别名",
					firstChars: "前X个字符",
					parentHeading: "父标题",
					selectedText: "选中文本"
				},
				descriptions: {
					noAlias: "链接显示为 [[文件#^abc123]] 不带任何别名文本",
					firstChars: "链接使用块内容的前X个字符作为别名：[[文件#^abc123|前几个词...]]",
					parentHeading: "链接使用最近的父标题作为别名：[[文件#^abc123|父标题]]",
					selectedText: "链接使用选中的文本作为别名：[[文件#^abc123|您选中的文本]]"
				}
			},
			aliasLength: {
				name: "别名长度",
				desc: "设置别名的长度（1-100）。仅在别名样式为"前X个字符"时使用"
			},
			headingIdNewline: {
				name: "实验性：标题块ID样式",
				desc: "仅选择单个标题行时在新行中放置块ID"
			}
		},

		// 嵌入链接部分
		embedLink: {
			title: "嵌入链接",
			desc: "链接格式：![[文件#块ID]]",
			enableRightClick: {
				name: "在右键菜单中启用嵌入链接"
			},
			enableNotification: {
				name: "复制嵌入链接时显示通知"
			}
		},

		// 可编辑嵌入链接部分
		editableEmbedLink: {
			title: "可编辑嵌入链接",
			desc: "链接格式：!![[文件#块ID]]",
			enableRightClick: {
				name: "在右键菜单中启用可编辑嵌入链接"
			},
			enableNotification: {
				name: "复制可编辑嵌入链接时显示通知"
			}
		},

		// Obsidian URI部分
		obsidianUri: {
			title: "Obsidian URI链接",
			desc: "链接格式：obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}",
			enableRightClick: {
				name: "在右键菜单中启用Obsidian URI链接"
			},
			enableNotification: {
				name: "复制URI链接时显示通知"
			}
		},

		// 块ID部分
		blockId: {
			title: "块ID",
			desc: "块ID生成设置",
			maxLength: {
				name: "最大长度",
				desc: "设置块ID的最大长度（3-7个字符）"
			},
			enablePrefix: {
				name: "启用前缀",
				desc: "为块ID添加自定义前缀"
			},
			prefix: {
				name: "前缀",
				desc: "块ID的自定义前缀"
			}
		},

		// 时间段部分
		timeSection: {
			title: "时间段",
			desc: "时间段功能设置",
			enable: {
				name: "启用时间段"
			},
			enableInMenu: {
				name: "在菜单中启用时间段",
				desc: "在右键菜单中显示时间段选项"
			},
			timeFormat: {
				name: "时间格式",
				desc: "设置时间显示格式（例如：HH:mm）"
			},
			titlePattern: {
				name: "标题模式",
				desc: "用于识别时间段标题的正则表达式模式"
			},
			insertAsHeading: {
				name: "插入为标题",
				desc: "将时间段作为标题插入"
			},
			plainStyle: {
				name: "预览中的纯文本样式",
				desc: "如果启用，时间块在预览模式下将显示为纯文本，即使作为标题插入"
			},
			dailyNotePattern: {
				name: "日记模式",
				desc: "用于识别日记文件名的正则表达式（默认：YYYY-MM-DD）"
			},
			headingLevel: {
				name: "日记标题级别",
				desc: "在日记中使用的标题级别（1-6，对应#-######）"
			}
		},

		// 时间线部分
		timeline: {
			title: "时间线功能",
			desc: "blp-timeline代码块功能设置",
			dataviewStatus: {
				available: "✅ Dataview插件已安装并启用（版本${version}）",
				unavailable: "❌ Dataview插件未安装或未启用。时间线功能将无法工作"
			},
			enable: {
				name: "启用时间线功能",
				desc: "启用blp-timeline代码块功能。需要Dataview插件"
			},
			defaultHeadingLevel: {
				name: "默认标题级别",
				desc: "时间线部分使用的默认标题级别（1-6）。可在代码块中覆盖"
			},
			defaultEmbedFormat: {
				name: "默认嵌入格式",
				desc: "嵌入时间线链接的默认格式。可在代码块中覆盖",
				options: {
					expanded: "展开嵌入（!![[]]）",
					collapsed: "折叠嵌入（![[]]）"
				}
			},
			defaultSortOrder: {
				name: "默认排序顺序",
				desc: "时间线条目的默认排序顺序。可在代码块中覆盖",
				options: {
					ascending: "升序（最旧的在前）",
					descending: "降序（最新的在前）"
				}
			}
		},

		// 嵌入块编辑
		sectionFlow: "嵌入块编辑",
		embeddedBlockDesc: "嵌入块内联编辑设置",
		editorFlowReplace: {
			name: "启用嵌入块编辑",
			desc: "启用就地编辑嵌入块功能"
		},
		editorFlowStyle: {
			name: "编辑样式",
			desc: "选择内联编辑的视觉样式",
			minimal: "简洁",
			seamless: "无缝"
		}
	}
} as const;