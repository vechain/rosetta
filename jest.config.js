// E2E test categories, all run against Rosetta + thor solo started once by globalSetup:
//   api  - tests/e2e/api:  call every endpoint and validate responses against the Rosetta spec schema
//   solo - tests/e2e/solo: cross-check response values and logic against the thor node API
// The rosetta-cli flow (third category) runs separately: tests/rosetta-cli/run.sh
const project = (name) => ({
    displayName: name,
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [`<rootDir>/tests/e2e/${name}/**/*.${name}.test.ts`],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
    }
});

module.exports = {
    projects: [project('api'), project('solo')],
    globalSetup: '<rootDir>/tests/e2e/globalSetup.ts',
    globalTeardown: '<rootDir>/tests/e2e/globalTeardown.ts',
    testTimeout: 120000,
    verbose: true,
    // All tests share one chain and the same funded accounts.
    maxWorkers: 1
};
