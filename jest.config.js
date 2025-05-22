module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/e2e/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    setupFilesAfterEnv: ['./tests/e2e/setup.ts'],
    testTimeout: 30000, // 30 seconds timeout for e2e tests
    verbose: true,
}; 