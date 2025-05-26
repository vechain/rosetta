module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        process.env.TEST_NETWORK === 'solo' 
            ? '**/tests/e2e/**/*.solo.test.ts'
            : process.env.TEST_NETWORK === 'galactica_devnet'
                ? '**/tests/e2e/**/*.galactica_devnet.test.ts'
                : []
    ],
    testPathIgnorePatterns: [
        '/node_modules/'
    ],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
    testTimeout: 300000, // 5 minutes timeout for e2e tests
    verbose: true,
    maxWorkers: 1, // Execute tests sequentially
}; 