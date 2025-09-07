import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { detectProjectLanguages } from "./projectLanguages";

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "magus-langs-"));
  return dir;
}

function touch(dir: string, rel: string) {
  const full = path.join(dir, rel);
  const parent = path.dirname(full);
  mkdirSync(parent, { recursive: true });
  writeFileSync(full, "x");
}

describe("detectProjectLanguages", () => {
  it("detects js/ts/json via package.json", () => {
    const dir = tempDir();
    touch(dir, "package.json");
    const langs = detectProjectLanguages(dir);
    expect(langs.has("javascript")).toBeTrue();
    expect(langs.has("typescript")).toBeTrue();
    expect(langs.has("json")).toBeTrue();
  });

  it("detects rust via Cargo.toml", () => {
    const dir = tempDir();
    touch(dir, "Cargo.toml");
    expect(detectProjectLanguages(dir).has("rust")).toBeTrue();
  });

  it("detects python via any python markers", () => {
    const dir = tempDir();
    touch(dir, "requirements.txt");
    expect(detectProjectLanguages(dir).has("python")).toBeTrue();
  });

  it("deduplicates overlapping markers", () => {
    const dir = tempDir();
    touch(dir, "package.json");
    touch(dir, "tsconfig.json");
    const langs = detectProjectLanguages(dir);
    let tsCount = 0;
    for (const l of langs) if (l === "typescript") tsCount++;
    expect(tsCount).toBe(1);
  });

  it("returns empty set when no markers", () => {
    const dir = tempDir();
    const langs = detectProjectLanguages(dir);
    expect(langs.size).toBe(0);
  });
});
