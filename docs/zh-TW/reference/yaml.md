# YAML 設定

時間線功能的完整 YAML 設定參考。

## 基礎結構

```yaml
---
# 必需設定
source_folders:
  - "資料夾路徑"

# 可選設定
heading_level: 4
within_days: 30
sort_order: desc
time_pattern: '(\\d{2}:\\d{2})'
debug: false

# 進階篩選
filters:
  relation: AND
  tags: {...}
  links: {...}
---
```

## 設定選項

### source_folders (必需)
指定搜尋的資料夾：
```yaml
source_folders:
  - "日記/2024"
  - "會議記錄"
  - "專案筆記/重要"
```

### 基礎選項

**heading_level** (1-6)
```yaml
heading_level: 4  # 比對 #### 層級標題
```

**within_days** (數字)
```yaml
within_days: 30   # 最近30天的檔案
```

**sort_order** (asc/desc)
```yaml
sort_order: desc  # 最新的在前
```

### 時間比對

**time_pattern** (正則表達式)
```yaml
# 比對 HH:MM 格式
time_pattern: '(\\d{2}:\\d{2})'

# 比對 H:MM 格式
time_pattern: '(\\d{1,2}:\\d{2})'

# 比對時間範圍
time_pattern: '(\\d{2}:\\d{2}-\\d{2}:\\d{2})'
```

## 篩選器設定

### 標籤篩選
```yaml
filters:
  tags:
    relation: AND        # AND 或 OR
    items:
      - '#專案/重要'
      - '#狀態/進行中'
    
    # 從 frontmatter 提取標籤
    from_frontmatter:
      key: "tags"
      exclude:
        - "草稿"
```

### 連結篩選
```yaml
filters:
  links:
    relation: OR         # AND 或 OR
    items:
      - "[[專案A]]"
      - "[[重要會議]]"
    
    # 自動包含連結到目前檔案的內容
    link_to_current_file: true
```

### 組合篩選
```yaml
filters:
  relation: AND          # 標籤和連結都要滿足
  
  tags:
    relation: OR         # 標籤滿足任一個
    items:
      - '#重要'
      - '#緊急'
  
  links:
    relation: AND        # 連結都要滿足
    items:
      - "[[專案]]"
      - "[[本週]]"
```

## 除錯設定

```yaml
debug: true
source_folders: ["日記"]
heading_level: 4
```

顯示除錯資訊：
- 解析的設定
- 找到的檔案數
- 篩選器比對結果
- 最終產生的連結數

## 完整範例

```yaml
---
# 聚合最近一個月專案相關的時間記錄
source_folders:
  - "日記/2024"
  - "會議記錄"

within_days: 30
heading_level: 4
time_pattern: '(\\d{2}:\\d{2})'
sort_order: desc

filters:
  relation: AND
  
  tags:
    relation: OR
    items:
      - '#專案/重要'
      - '#會議'
  
  links:
    relation: OR
    items:
      - "[[專案A]]"
      - "[[客戶溝通]]"
    link_to_current_file: true
---
```
