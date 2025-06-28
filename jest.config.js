/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // 处理 CSS 导入
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 路径别名映射，与 tsconfig.json 保持一致
    '^main$': '<rootDir>/src/main.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^basics/(.*)$': '<rootDir>/src/basics/$1',
    '^css/(.*)$': '<rootDir>/src/css/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }]
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-utils/**',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.git/'],
  // 模拟 Obsidian API
  moduleDirectories: ['node_modules', '<rootDir>'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
}; 