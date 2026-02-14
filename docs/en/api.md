# API Reference

Block Link Plus programming interface.

## Global API

Plugin registers a global object at `window.BlockLinkPlus` (the plugin instance):

```javascript
// Get plugin instance
const plugin = window.BlockLinkPlus;
```

## Available Methods

### Inline Edit (compat API)
```javascript
// Compatibility API: current versions no longer "open/close a Flow Editor UI" (usually a no-op)
plugin.api.openFlowEditor();

// Same as above
plugin.api.closeFlowEditor();

// Check if Inline Edit is enabled (setting: inlineEditEnabled)
const isEnabled = plugin.api.isFlowEnabled();
```

### Settings Management
```javascript
// Get current settings
const settings = plugin.api.getSettings();

// Update settings
await plugin.api.updateSettings({
    mult_line_handle: 1,
    alias_type: 2
});
```

### Editor Access
```javascript
// Get current editor instance (CodeMirror; may be null)
const editor = plugin.api.getActiveEditor();

// Get path handler
const enactor = plugin.api.getEnactor();
```

## Settings Interface

```typescript
interface PluginSettings {
    mult_line_handle: number;
    alias_type: number;
    enable_right_click_block: boolean;
    alias_length: number;
    enable_prefix: boolean;
    id_prefix: string;
    id_length: number;
    // ... other settings
}
```

## Notes

- API is experimental and may change in updates
- Only available after plugin loads
- Check method existence before calling

## Example Usage

```javascript
// Check plugin availability
if (window.BlockLinkPlus) {
    const plugin = window.BlockLinkPlus;
    
    // Get settings
    const settings = plugin.api.getSettings();
    console.log('Current alias length:', settings.alias_length);
    
    // Modify settings
    await plugin.api.updateSettings({
        alias_length: 30
    });
}
```

## TODO

- Detailed type definitions
- More operation methods
- Event listening mechanism
- Complete development examples

More API information at [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues).
