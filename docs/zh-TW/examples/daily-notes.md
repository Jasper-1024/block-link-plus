# 日記應用

使用 Block Link Plus 最佳化日記工作流。

## 基礎設定

### Enhanced List Blocks 設定
```
啟用範圍: 在設定中加入日記資料夾/檔案，或在檔案 frontmatter 寫入 blp_enhanced_list: true
Dataview: 需要安裝並啟用（用於 blp-view 查詢/檢視）
```

### 多行塊設定
```
多行處理: 新增新標題
別名類型: 前20個字元
啟用前綴: 是
ID前綴: diary
```

## 日記範本

```markdown
---
blp_enhanced_list: true
---

# 2024-01-15

## 晨間規劃
- [ ] 回顧昨日總結
- [ ] 安排今日重點

## Log
- 09:00 晨會 [[專案A]] #專案/A
- 14:30 客戶溝通 [[專案A]] #客戶/重點
  - 客戶回饋整理...

## 18:00 日結
今日完成：
今日問題：
明日重點：
```

## 使用 blp-view 聚合（取代時間線）

在月度或專案總結中建立 View：

````markdown
# 專案A - 一月總結

## 關鍵時間點

```blp-view
source:
  folders:
    - "日記/2024-01"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[專案A]]"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## 快速操作

### 建立重要內容塊
1. 選取重要段落
2. 右鍵 → "複製塊連結"
3. 在專案筆記中引用

### 跨日期引用
```markdown
昨天的重要決定：![[2024-01-14#^diary-abc123]]
```

## 進階技巧

### 標籤體系
```markdown
- 09:00 專案會議 #專案/A #會議/重要
- 14:30 客戶溝通 #客戶/重點 #狀態/待跟進
```

### 連結網路
```markdown
- 09:00 [[專案A]] 進度同步
- 與 [[張三]] 討論 [[技術方案]]
```

### 多維度 Query/View（範例）

````markdown
```blp-view
filters:
  tags:
    any:
      - "#專案/A"
render:
  type: table
```
````
