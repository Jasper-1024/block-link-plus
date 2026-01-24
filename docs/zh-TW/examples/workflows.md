# 工作流範例

Block Link Plus 在不同場景下的應用方法。

## 專案管理

### 會議記錄 → 專案追蹤

**會議記錄 (2024-01-15-專案A會議.md)**
```markdown
# 專案A週例會

## 09:30 進度匯報
張三：前端頁面完成60% ^meeting-progress
李四：後端API開發中 ^meeting-backend

## 10:00 問題討論
資料庫效能需要最佳化 ^meeting-issue

## 10:15 下週計劃
1. 完成前端剩餘頁面
2. 效能最佳化方案確定 ^meeting-plan
```

**專案總覽 (專案A.md)**
```markdown
# 專案A總覽

## 本週進度
![[2024-01-15-專案A會議#^meeting-progress]]

## 待解決問題
![[2024-01-15-專案A會議#^meeting-issue]]

## 下週安排
![[2024-01-15-專案A會議#^meeting-plan]]
```

### 進度聚合（blp-view）

````markdown
# 專案A - 進度檢視

```blp-view
source:
  folders:
    - "團隊日報"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[專案A]]"
  tags:
    any:
      - "#進展"
      - "#問題"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## 學習筆記

### 知識點提取

**React學習筆記.md**
```markdown
# React Hooks 學習

## useState 用法
useState回傳狀態值和更新函數 ^react-usestate

## useEffect 用法  
useEffect處理副作用和生命週期 ^react-useeffect

## 自訂Hook
抽取元件邏輯，實現程式碼複用 ^react-custom-hooks
```

**專案開發筆記.md**
```markdown
# 前端開發要點

## React最佳實務
![[React學習筆記#^react-usestate]]
![[React學習筆記#^react-useeffect]]

## 效能最佳化
使用自訂Hook: ![[React學習筆記#^react-custom-hooks]]
```

## 研究工作流

### 文獻管理

**論文閱讀-AI模型最佳化.md**
```markdown
# GPT-4 Architecture Analysis

## 核心創新點
Transformer架構的改進 ^paper-innovation

## 訓練方法
使用RLHF進行對齊 ^paper-training

## 應用場景
多模態能力擴展 ^paper-application
```

**研究專案.md**
```markdown
# AI模型研究專案

## 理論基礎
![[論文閱讀-AI模型最佳化#^paper-innovation]]

## 訓練策略
![[論文閱讀-AI模型最佳化#^paper-training]]
```

### 實驗記錄

使用 list item 記錄實驗過程（可搭配 Enhanced List Blocks）：

```markdown
---
blp_enhanced_list: true
---

# 實驗記錄 - 2024-01-15

- 09:00 環境準備
- 10:30 模型訓練（batch_size=32）
- 14:00 結果分析（accuracy=85%）
- 16:30 參數調優（lr=0.001）
```

## 團隊協作

### 任務分配

**專案分工.md**
```markdown
# 團隊任務分配

## 張三 - 前端開發
負責使用者介面實現 ^task-frontend
截止時間：1月20日

## 李四 - 後端開發  
負責API介面開發 ^task-backend
截止時間：1月18日

## 王五 - 測試
負責功能測試和整合測試 ^task-testing
截止時間：1月25日
```

### 個人任務看板

每個人的任務檔案中引用分配的任務：

**張三任務.md**
```markdown
# 本週任務

## 主要工作
![[專案分工#^task-frontend]]

## 進度追蹤
- [x] 登入頁面
- [ ] 使用者中心
- [ ] 資料展示頁面
```

### 進度匯總

使用 blp-view 匯總團隊進度：

````markdown
```blp-view
source:
  folders:
    - "團隊日報"
filters:
  date:
    within_days: 7
  tags:
    any:
      - "#完成"
      - "#進展"
group:
  by: file
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````
