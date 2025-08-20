import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
  },
});
