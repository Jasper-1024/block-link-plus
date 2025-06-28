// 全局 Jest 类型声明
// 这个文件允许在测试文件中使用 Jest 的全局函数和对象

declare global {
  const describe: (name: string, fn: () => void) => void;
  const test: (name: string, fn: () => void) => void;
  const it: typeof test;
  const expect: any;
  const beforeEach: (fn: () => void) => void;
  const afterEach: (fn: () => void) => void;
  const beforeAll: (fn: () => void) => void;
  const afterAll: (fn: () => void) => void;
  const jest: any;
}

export {}; 