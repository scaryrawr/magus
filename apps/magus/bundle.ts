#!/usr/bin/env bun

import { $ } from "bun";

const targets = ["bun-linux-x64", "bun-linux-arm64", "bun-windows-x64", "bun-darwin-x64", "bun-darwin-arm64"];
const buildTarget = async (target: string) => {
  await $`bun build --compile --target=${target} --minify --sourcemap ./src/main.tsx --outfile dist/${target}/magus`;
};

const bundleTasks = targets.map(buildTarget);
await Promise.all(bundleTasks);
