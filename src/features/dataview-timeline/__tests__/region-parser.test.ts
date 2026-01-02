/**
 * region-parser.ts 的测试文件
 */
import { findDynamicRegion, REGION_START_MARKER_PREFIX, REGION_END_MARKER } from '../region-parser';

describe('region-parser', () => {
  describe('findDynamicRegion', () => {
    test('应该找到完整的区域', () => {
      const content = `
前面的内容
${REGION_START_MARKER_PREFIX} %%
区域内容
${REGION_END_MARKER}
后面的内容
      `.trim();
      
      const result = findDynamicRegion(content, 0);
      
      expect(result).toEqual({
        regionStartLine: 1,
        regionEndLine: 3,
        currentContent: '区域内容',
        existingHash: null
      });
    });
    
    test('当区域不存在时应该返回 null', () => {
      const content = `
没有区域标记的内容
      `.trim();
      
      const result = findDynamicRegion(content, 0);
      
      expect(result).toBeNull();
    });
    
    test('当只有开始标记时应该返回 null', () => {
      const content = `
前面的内容
${REGION_START_MARKER_PREFIX} %%
区域内容但没有结束标记
      `.trim();
      
      const result = findDynamicRegion(content, 0);
      
      expect(result).toBeNull();
    });
    
    test('当只有结束标记时应该返回 null', () => {
      const content = `
前面的内容
区域内容但没有开始标记
${REGION_END_MARKER}
      `.trim();
      
      const result = findDynamicRegion(content, 0);
      
      expect(result).toBeNull();
    });
  });
}); 
