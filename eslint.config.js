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
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "@typescript-eslint/no-require-imports": "off",
            "no-console": "off",
            "jest/no-disabled-tests": "warn",
            "jest/no-focused-tests": "error",
            "jest/no-identical-title": "error",
            "jest/prefer-to-have-length": "warn",
            "jest/valid-expect": "error"
        }
    }),
    {
        files: ["typings/**/*.d.ts"],
        rules: {
            "@typescript-eslint/triple-slash-reference": "off"
        }
    }
];