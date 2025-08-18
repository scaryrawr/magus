import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.tsx",
  output: {
    file: "dist/index.js",
    format: "es",
    inlineDynamicImports: true,
    sourcemap: true,
  },
  external: [
    // Node.js built-ins only - bundle workspace dependencies to avoid React conflicts
    "fs",
    "path",
    "url",
    "util",
    "events",
    "stream",
    "buffer",
    "crypto",
    "http",
    "https",
    "net",
    "os",
    "tty",
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
      extensions: [".js", ".ts", ".tsx"],
    }),
    commonjs(),
    json(),
    typescript({
      compilerOptions: {
        noEmit: false,
        allowImportingTsExtensions: false,
        verbatimModuleSyntax: false,
        module: "ESNext",
        target: "ESNext",
        moduleResolution: "bundler",
        sourceMap: true,
        inlineSources: true,
      },
      include: ["src/**/*"],
      outputToFilesystem: false,
    }),
  ],
};
