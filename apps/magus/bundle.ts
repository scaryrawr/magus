#!/usr/bin/env bun

import { $ } from "bun";
import fs from "fs/promises";
import path from "path";

const targets = ["bun-linux-x64", "bun-linux-arm64", "bun-windows-x64", "bun-darwin-x64", "bun-darwin-arm64"];
const buildTarget = async (target: string) => {
  await $`bun build --compile --target=${target} --minify --sourcemap ./src/main.ts --outfile dist/${target.replace("bun-", "magus-")}/bin/magus`;
};

const bundleTasks = targets.map(buildTarget);
await Promise.all(bundleTasks);

// After building, create tar.gz for each folder in dist
const distDir = path.resolve(process.cwd(), "dist");
try {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    const archivePath = path.join(distDir, `${name}.tar.gz`);
    // Remove existing archive if present
    try {
      await fs.unlink(archivePath);
    } catch {
      // ignore if it doesn't exist
    }
    // Create tar.gz using system tar. On failure, surface helpful error.
    try {
      // Use -C to ensure the folder is archived without parent paths
      await $`tar -C ${distDir} -czf ${archivePath} ${name}`;
      console.log(`Created ${archivePath}`);
    } catch (err) {
      console.error(`Failed to create tar.gz for ${name}:`, err);
      throw new Error("tar command failed. Ensure 'tar' is available in PATH on this system.");
    }
  }
} catch (err) {
  console.error("Failed to package dist folders:", err);
  throw err;
}
