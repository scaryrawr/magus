import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Define projects for workspace coverage
    projects: ["./packages/providers", "./packages/server", "./packages/ink-ext"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Include all source files from packages
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: ["packages/*/src/**/*.test.{ts,tsx}", "packages/*/src/**/*.d.ts"],
      // Generate reports in root coverage directory
      reportsDirectory: "./coverage",
      // Merge coverage from all packages
      clean: true,
    },
  },
});
