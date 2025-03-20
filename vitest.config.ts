import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/endpoints/**/*.ts"],
    globalSetup: "test/globalSetup.ts",
    testTimeout: 30_000,
  },
})
