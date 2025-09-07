import { describe, expect, it } from "bun:test";
import { DiagnosticsStore } from "./diagnostics";

describe("DiagnosticsStore", () => {
  it("aggregates diagnostics per client", () => {
    const store = new DiagnosticsStore();
    const uri = "file:///tmp/test.ts";
    store.upsert(uri, "ts", [
      {
        message: "oops",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        severity: 1,
        source: "ts",
      },
    ]);
    store.upsert(uri, "eslint", [
      {
        message: "semi",
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } },
        severity: 2,
        source: "eslint",
      },
    ]);
    const res = store.get(uri)!;
    expect(Object.keys(res.byClient)).toContain("ts");
    expect(Object.keys(res.byClient)).toContain("eslint");
    expect(res.all.length).toBe(2);
  });

  it("clears diagnostics for a single client", () => {
    const store = new DiagnosticsStore();
    const uri = "file:///tmp/test.ts";
    store.upsert(uri, "ts", [
      {
        message: "oops",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        severity: 1,
        source: "ts",
      },
    ]);
    store.upsert(uri, "eslint", [
      {
        message: "semi",
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } },
        severity: 2,
        source: "eslint",
      },
    ]);
    store.clear(uri, "ts");
    const res = store.get(uri)!;
    expect(Object.keys(res.byClient)).not.toContain("ts");
    expect(res.all.length).toBe(1);
  });
});
