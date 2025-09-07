import { describe, expect, it } from "bun:test";
import path from "node:path";
import { __TESTING__, matchesSelector } from "./selector";

describe("selector utils", () => {
  const root = "/project";
  const file = path.join(root, "src", "deep", "file.ts");

  it("globToRegex handles ** and * and leading ./", () => {
    const rx1 = __TESTING__.globToRegex("./src/**/*.ts");
    expect(rx1.test("src/deep/file.ts")).toBeTrue();
    const rx2 = __TESTING__.globToRegex("src/*.ts");
    expect(rx2.test("src/index.ts")).toBeTrue();
    expect(rx2.test("src/deep/index.ts")).toBeFalse();
  });

  it("matchesSelector supports language string selector", () => {
    expect(matchesSelector(file, root, ["typescript"])).toBeTrue();
  });

  it("matchesSelector supports pattern without leading ./", () => {
    expect(
      matchesSelector(file, root, [
        {
          language: "typescript",
          pattern: "src/**/*.ts",
          scheme: "file",
        },
      ]),
    ).toBeTrue();
  });

  it("matchesSelector rejects non-matching pattern", () => {
    expect(
      matchesSelector(file, root, [
        {
          language: "typescript",
          pattern: "lib/**/*.ts",
          scheme: "file",
        },
      ]),
    ).toBeFalse();
  });
});
