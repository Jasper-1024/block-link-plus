/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.ts',
    // 憭? CSS 撖澆
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 頝臬??怠???嚗? tsconfig.json 靽?銝??
    '^main$': '<rootDir>/src/main.ts',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^basics/(.*)$': '<rootDir>/src/basics/$1',
    '^shared/(.*)$': '<rootDir>/src/shared/$1',
    '^ui/(.*)$': '<rootDir>/src/ui/$1',
    '^features/(.*)$': '<rootDir>/src/features/$1',
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
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
  testPathIgnorePatterns: ['/node_modules/', '/.git/', '/_research/'],
  modulePathIgnorePatterns: ['/_research/'],
  // 璅⊥? Obsidian API
  moduleDirectories: ['node_modules', '<rootDir>'],
};
