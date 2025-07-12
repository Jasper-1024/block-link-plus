export default {
	flow: {
		edit: "編輯",
		open: "開啟",
		hover: "懸停編輯"
	},
	commandPalette: {
		openFlow: "開啟流程編輯器",
		closeFlow: "關閉流程編輯器"
	},
	settings: {
		// 插件標題
		pluginTitle: "Block Link Plus",

		// 多行區塊行為
		multiLineHandle: {
			name: "多行區塊行為",
			desc: "定義多行選擇如何生成區塊ID",
			options: {
				default: "預設",
				addHeading: "添加新標題",
				addMultiBlock: "添加多個區塊",
				addMultilineBlock: "添加多行區塊"
			},
			descriptions: {
				default: "將多行選擇視為單個區塊，在選擇末尾創建一個區塊ID ^abc123",
				addHeading: "在選擇上方添加新標題，創建帶有區塊ID的標題以便組織",
				addMultiBlock: "為每行創建單獨的區塊ID，每行都有自己的 ^abc123 標識符",
				addMultilineBlock: "創建 ^abc123-abc123 格式的範圍區塊，在第一行標記 ^abc123，在最後一行後添加 ^abc123-abc123 以進行精確的多行引用"
			}
		},

		// 區塊連結部分
		blockLink: {
			title: "區塊連結",
			desc: "連結格式：[[檔案#區塊ID]]",
			enableRightClick: {
				name: "在右鍵選單中啟用區塊連結"
			},
			enableNotification: {
				name: "複製區塊連結時顯示通知"
			},
			aliasStyle: {
				name: "別名樣式",
				desc: "選擇如何為區塊連結生成別名。對於標題區塊，除非選擇「無別名」，否則別名始終是標題文字",
				options: {
					noAlias: "無別名",
					firstChars: "前X個字元",
					parentHeading: "父標題",
					selectedText: "選中文字"
				},
				descriptions: {
					noAlias: "連結顯示為 [[檔案#^abc123]] 不帶任何別名文字",
					firstChars: "連結使用區塊內容的前X個字元作為別名：[[檔案#^abc123|前幾個詞...]]",
					parentHeading: "連結使用最近的父標題作為別名：[[檔案#^abc123|父標題]]",
					selectedText: "連結使用選中的文字作為別名：[[檔案#^abc123|您選中的文字]]"
				}
			},
			aliasLength: {
				name: "別名長度",
				desc: "設定別名的長度（1-100）。僅在別名樣式為「前X個字元」時使用"
			},
			headingIdNewline: {
				name: "實驗性：標題區塊ID樣式",
				desc: "僅選擇單個標題行時在新行中放置區塊ID"
			}
		},

		// 嵌入連結部分
		embedLink: {
			title: "嵌入連結",
			desc: "連結格式：![[檔案#區塊ID]]",
			enableRightClick: {
				name: "在右鍵選單中啟用嵌入連結"
			},
			enableNotification: {
				name: "複製嵌入連結時顯示通知"
			}
		},

		// 可編輯嵌入連結部分
		editableEmbedLink: {
			title: "可編輯嵌入連結",
			desc: "連結格式：!![[檔案#區塊ID]]",
			enableRightClick: {
				name: "在右鍵選單中啟用可編輯嵌入連結"
			},
			enableNotification: {
				name: "複製可編輯嵌入連結時顯示通知"
			}
		},

		// Obsidian URI部分
		obsidianUri: {
			title: "Obsidian URI連結",
			desc: "連結格式：obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}",
			enableRightClick: {
				name: "在右鍵選單中啟用Obsidian URI連結"
			},
			enableNotification: {
				name: "複製URI連結時顯示通知"
			}
		},

		// 區塊ID部分
		blockId: {
			title: "區塊ID",
			desc: "區塊ID生成設定",
			maxLength: {
				name: "最大長度",
				desc: "設定區塊ID的最大長度（3-7個字元）"
			},
			enablePrefix: {
				name: "啟用前綴",
				desc: "為區塊ID添加自訂前綴"
			},
			prefix: {
				name: "前綴",
				desc: "區塊ID的自訂前綴"
			}
		},

		// 時間段部分
		timeSection: {
			title: "時間段",
			desc: "時間段功能設定",
			enable: {
				name: "啟用時間段"
			},
			enableInMenu: {
				name: "在選單中啟用時間段",
				desc: "在右鍵選單中顯示時間段選項"
			},
			timeFormat: {
				name: "時間格式",
				desc: "設定時間顯示格式（例如：HH:mm）"
			},
			titlePattern: {
				name: "標題模式",
				desc: "用於識別時間段標題的正規表達式模式"
			},
			insertAsHeading: {
				name: "插入為標題",
				desc: "將時間段作為標題插入"
			},
			plainStyle: {
				name: "預覽中的純文字樣式",
				desc: "如果啟用，時間區塊在預覽模式下將顯示為純文字，即使作為標題插入"
			},
			dailyNotePattern: {
				name: "日記模式",
				desc: "用於識別日記檔案名的正規表達式（預設：YYYY-MM-DD）"
			},
			headingLevel: {
				name: "日記標題級別",
				desc: "在日記中使用的標題級別（1-6，對應#-######）"
			}
		},

		// 時間線部分
		timeline: {
			title: "時間線功能",
			desc: "blp-timeline程式碼區塊功能設定",
			dataviewStatus: {
				available: "✅ Dataview插件已安裝並啟用（版本${version}）",
				unavailable: "❌ Dataview插件未安裝或未啟用。時間線功能將無法工作"
			},
			enable: {
				name: "啟用時間線功能",
				desc: "啟用blp-timeline程式碼區塊功能。需要Dataview插件"
			},
			defaultHeadingLevel: {
				name: "預設標題級別",
				desc: "時間線部分使用的預設標題級別（1-6）。可在程式碼區塊中覆蓋"
			},
			defaultEmbedFormat: {
				name: "預設嵌入格式",
				desc: "嵌入時間線連結的預設格式。可在程式碼區塊中覆蓋",
				options: {
					expanded: "展開嵌入（!![[]]）",
					collapsed: "摺疊嵌入（![[]]）"
				}
			},
			defaultSortOrder: {
				name: "預設排序順序",
				desc: "時間線條目的預設排序順序。可在程式碼區塊中覆蓋",
				options: {
					ascending: "升序（最舊的在前）",
					descending: "降序（最新的在前）"
				}
			}
		},

		// 嵌入區塊編輯
		sectionFlow: "嵌入區塊編輯",
		embeddedBlockDesc: "嵌入區塊內聯編輯設定",
		editorFlowReplace: {
			name: "啟用嵌入區塊編輯",
			desc: "啟用就地編輯嵌入區塊功能"
		},
		editorFlowStyle: {
			name: "編輯樣式",
			desc: "選擇內聯編輯的視覺樣式",
			minimal: "簡潔",
			seamless: "無縫"
		}
	}
} as const;