# 時間線

從多個檔案提取時間標題，按時間排序產生聚合檢視。

## 基礎用法

建立 `blp-timeline` 程式碼區塊：

````markdown
```blp-timeline
---
source_folders:
  - "日記"
heading_level: 4
---
```
````

## 核心設定

### 必需設定
```yaml
source_folders:
  - "日記/2024"
  - "會議記錄"
```

### 常用選項
```yaml
heading_level: 4              # 提取的標題層級
within_days: 30              # 最近30天
sort_order: desc             # desc/asc
embed_format: '!![[]]'       # !![[]] 或 ![[]]
```

## 篩選器

### 按標籤篩選
```yaml
filters:
  tags:
    relation: AND
    items:
      - '#專案/重要'
      - '#狀態/進行中'
```

### 按連結篩選
```yaml
filters:
  links:
    relation: OR
    items:
      - "[[專案A]]"
      - "[[會議]]"
    link_to_current_file: true
```

### 組合篩選
```yaml
filters:
  relation: AND
  tags:
    relation: OR
    items:
      - '#重要'
  links:
    relation: AND
    items:
      - "[[專案]]"
```

## 時間比對

提取標題中的時間用於排序：

```yaml
time_pattern: '(\\d{2}:\\d{2})'
```

比對標題："#### 14:30 專案會議" → 提取 "14:30"

## 輸出格式

產生的時間線格式：

```
%% blp-timeline-start data-hash="..." %%
[[檔案1]]

![[檔案1#標題1]]

![[檔案1#標題2]]

---
[[檔案2]]

![[檔案2#標題1]]
%% blp-timeline-end %%
```

## 除錯模式

新增 `debug: true` 檢視詳細資訊：

```yaml
debug: true
source_folders: ["日記"]
```

顯示設定解析、查詢結果和篩選統計。

## 相依需求

時間線功能需要 Dataview 外掛，在設定頁面可檢視狀態。