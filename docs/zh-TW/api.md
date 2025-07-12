# API 參考

Block Link Plus 提供的程式設計介面。

## 全域 API

外掛在 `window.BlockLinkPlus` 註冊全域物件：

```javascript
// 取得外掛執行個體
const plugin = window.BlockLinkPlus;
```

## 可用方法

### 流式編輯器控制
```javascript
// 開啟流式編輯器
plugin.api.openFlowEditor();

// 關閉流式編輯器  
plugin.api.closeFlowEditor();

// 檢查是否啟用
const isEnabled = plugin.api.isFlowEnabled();
```

### 設定管理
```javascript
// 取得目前設定
const settings = plugin.api.getSettings();

// 更新設定
await plugin.api.updateSettings({
    mult_line_handle: 1,
    alias_type: 2
});
```

### 編輯器存取
```javascript
// 取得目前編輯器執行個體
const editor = plugin.api.getActiveEditor();

// 取得路徑操作器
const enactor = plugin.api.getEnactor();
```

## 設定介面

```typescript
interface PluginSettings {
    mult_line_handle: number;
    alias_type: number;
    enable_right_click_block: boolean;
    alias_length: number;
    enable_prefix: boolean;
    id_prefix: string;
    id_length: number;
    // ... 其他設定項
}
```

## 注意事項

- API 為實驗性功能，可能在版本更新中變化
- 僅在外掛載入後可用
- 建議檢查方法存在性後再呼叫

## 範例用法

```javascript
// 檢查外掛是否可用
if (window.BlockLinkPlus) {
    const plugin = window.BlockLinkPlus;
    
    // 取得設定
    const settings = plugin.api.getSettings();
    console.log('目前別名長度:', settings.alias_length);
    
    // 修改設定
    await plugin.api.updateSettings({
        alias_length: 30
    });
}
```

## TODO

- 詳細的類型定義
- 更多操作方法
- 事件監聽機制
- 完整的開發範例

更多 API 資訊請關注 [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)。