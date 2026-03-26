import type { Config } from 'jest';

export const baseJestConfig: Config = {
  preset: 'ts-jest',

  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: './.reports/unit/coverage',

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'babel',

  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: -10,
    },
  },

  coveragePathIgnorePatterns: ['/__tests__/', '/__mocks__/'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testPathIgnorePatterns: ['.build'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],

  // Map .txt imports to a simple string mock so Jest does not need esbuild's
  // text loader.  The real content is inlined by esbuild at bundle time.
  moduleNameMapper: {
    '\\.txt$': '<rootDir>/src/__mocks__/textFile.ts',
  },

  // Use this configuration option to add custom reporters to Jest
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: './.reports/unit/test-report.html',
        includeFailureMsg: true,
      },
    ],
  ],

  // The test environment that will be used for testing
  testEnvironment: 'jsdom',
};

const utilsJestConfig: Config = {
  ...baseJestConfig,

  testEnvironment: 'node',

  coveragePathIgnorePatterns: [
    ...(baseJestConfig.coveragePathIgnorePatterns ?? []),
    'zod-validators.ts',
  ],
};

export default utilsJestConfig;
