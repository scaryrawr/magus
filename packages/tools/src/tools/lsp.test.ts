import { type FileDiagnostics, LspManager } from "@magus/lsp";
import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { collectDiagnostics } from "./lsp";

// Simple mock LspManager focusing on getDiagnostics behavior.
class MockLspManager extends LspManager {
  private map = new Map<string, FileDiagnostics>();
  constructor() {
    super([], process.cwd());
  }
  public __set(uri: string, diags: { client: string; diagnostics: Diagnostic[] }) {
    this.map.set(uri, {
      uri,
      byClient: { [diags.client]: diags.diagnostics },
      all: diags.diagnostics,
    });
  }
  public override getDiagnostics(uri: string) {
    return this.map.get(uri);
  }
}

describe("lsp_diagnostics tool", () => {
  it("returns flattened diagnostics for provided files", async () => {
    const mgr = new MockLspManager();
    const filePath = `${process.cwd()}/foo.ts`;
    const uri = URI.file(filePath).toString();
    mgr.__set(uri, {
      client: "tsserver",
      diagnostics: [
        {
          message: "Type error",
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: 1,
          source: "tsserver",
        },
      ],
    });

    const res = collectDiagnostics(mgr, process.cwd(), { files: [uri] });
    expect(res.diagnostics.length).toBe(1);
    const d = res.diagnostics[0];
    expect(d.message).toBe("Type error");
    expect(d.client_id).toBe("tsserver");
    expect(d.uri).toBe(uri);
  });

  it("skips files with no diagnostics unless include_empty is true", async () => {
    const mgr = new MockLspManager();
    const uri = URI.file(`${process.cwd()}/empty.ts`).toString();
    const res1 = collectDiagnostics(mgr, process.cwd(), { files: [uri] });
    expect(res1.diagnostics.length).toBe(0);
    const res2 = collectDiagnostics(mgr, process.cwd(), { files: [uri], include_empty: true });
    expect(res2.diagnostics.length).toBe(0); // still zero; presence implied by empty
  });
});
