const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended
});

module.exports = [
    {
        ignores: ["node_modules/**", "dist/**", "coverage/**", "*.js", "!jest.config.js"]
    },
    ...compat.config({
        parser: "@typescript-eslint/parser",
        extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:jest/recommended"],
        plugins: ["@typescript-eslint", "jest"],
        env: {
            node: true,
            es6: true,
            jest: true
        },
        parserOptions: {
            ecmaVersion: 2020,
            sourceType: "module"
        },
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "@typescript-eslint/no-require-imports": "off",
            "no-console": "off",
            "jest/no-disabled-tests": "warn",
            "jest/no-focused-tests": "error",
            "jest/no-identical-title": "error",
            "jest/prefer-to-have-length": "warn",
            "jest/valid-expect": "error",
            "jest/no-standalone-expect": ["error", { additionalTestBlockFunctions: ["knownBug"] }]
        }
    }),
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: __dirname
            }
        }
    },
    // Strictly typed modules: `any` must not leak through here. Extend this list
    // as other directories are cleaned up (index.ts, tests).
    {
        files: [
            "src/common/**/*.ts",
            "src/controllers/**/*.ts",
            "src/middlewares/**/*.ts",
            "src/server/**/*.ts",
            "src/utils/**/*.ts"
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            // Rejects `any`-typed conditions such as `decoded.length ? ... : ...`
            // on thor-devkit's abi.Decoded, which silently returned 0 balances.
            "@typescript-eslint/strict-boolean-expressions": ["error", {
                allowString: true,
                allowNumber: true,
                allowNullableObject: true,
                allowNullableBoolean: true,
                allowNullableString: true,
                allowAny: false
            }]
        }
    },
    {
        files: ["typings/**/*.d.ts"],
        rules: {
            "@typescript-eslint/triple-slash-reference": "off"
        }
    }
];