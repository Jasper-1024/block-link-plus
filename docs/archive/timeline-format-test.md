# Timeline 格式测试

这个文件用于测试新的 Timeline 输出格式。

```blp-timeline
debug: false
source_folders: ["Review/day"]
heading_level: 4
filters:
  relation: AND
  links:
    relation: AND
    link_to_current_file: true
```

期望的输出格式应该是：

```
%% blp-timeline-start data-hash="..." %%
[[Review/day/2025/6/2025-6-17.md]]

![[Review/day/2025/6/2025-6-17.md#11:43]]

![[Review/day/2025/6/2025-6-17.md#11:50]]

---
[[Review/day/2025/6/2025-6-28.md]]

![[Review/day/2025/6/2025-6-28.md#17:21]]
%% blp-timeline-end %%
```

## 测试说明

1. **基本功能测试**
   - 验证输出格式是否包含文件链接
   - 验证文件之间是否有 `---` 分隔符
   - 验证每个内容行之间是否有空行

2. **用户修改保留测试**
   - 手动修改一些嵌入链接（例如添加别名）
   - 运行 Timeline 更新
   - 验证修改是否被保留

3. **哈希机制测试**
   - 不改变内容，再次运行 Timeline
   - 验证文件是否未被更新 