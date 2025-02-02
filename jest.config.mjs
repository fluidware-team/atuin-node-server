/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testPathIgnorePatterns: ['dist/', 'node_modules/', 'reports/', 'data/'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'cobertura']
};
