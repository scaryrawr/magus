import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DidChangeTextDocumentNotification,
  DidCloseTextDocumentNotification,
  DidOpenTextDocumentNotification,
  type DidChangeTextDocumentParams,
  type DidOpenTextDocumentParams,
} from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { LspManager, type LspConfig } from "./lspManager";

// Helper to make a temp project root
function makeProject(): string {
  return mkdtempSync(path.join(tmpdir(), "magus-lspm-"));
}

interface CaptureBase<M extends string = string, P = unknown> {
  method: M;
  params: P;
}

type NotificationCapture =
  | CaptureBase<typeof DidOpenTextDocumentNotification.method, DidOpenTextDocumentParams>
  | CaptureBase<typeof DidChangeTextDocumentNotification.method, DidChangeTextDocumentParams>
  | CaptureBase<typeof DidCloseTextDocumentNotification.method, { textDocument: { uri: string } }>
  | CaptureBase<string, unknown>; // fallback for any other method (e.g., diagnostics in real impl)

interface Capture {
  notifications: NotificationCapture[];
  handlers: Record<string, (params: unknown) => void>;
  starts: number;
}

function createManager(rootDir: string, projectLanguages: Set<string>) {
  const configs: LspConfig[] = [
    {
      id: "ts",
      name: "TypeScript",
      cmd: "typescript-language-server",
      selector: ["typescript"],
    },
    {
      id: "markdown",
      name: "Markdown",
      cmd: "markdown-language-server",
      selector: [
        {
          language: "markdown",
          pattern: "README.*", // test pattern matching
          scheme: "file",
        },
      ],
    },
    {
      id: "py",
      name: "Python",
      cmd: "py-language-server",
      selector: ["python"],
    },
  ];

  const captures: Record<string, Capture> = {};

  const mgr = new LspManager(configs, rootDir, {
    // Pretend every command exists so filtering relies on language intersection
    commandExists: () => true,
    projectLanguagesFn: () => projectLanguages,
  });

  // Monkey patch private startClient to avoid spawning real processes.
  // TypeScript privacy is compile-time only, so this is safe in tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mgr as any).startClient = (entry: { id: string; started: boolean; starting: boolean; client?: unknown }) => {
    const id = entry.id;
    if (!captures[id]) {
      captures[id] = { notifications: [], handlers: {}, starts: 0 };
    }
    const cap = captures[id];
    if (entry.started && entry.client) return Promise.resolve(entry.client);
    cap.starts++;
    const client = {
      sendNotification(method: string, params: unknown) {
        cap.notifications.push({ method, params });
      },
      onNotification(method: string, handler: (params: unknown) => void) {
        cap.handlers[method] = handler;
      },
      // Lifecycle methods are no-ops in stub
      // They must return/resolve to satisfy interface semantics
      shutdown: async () => {
        return;
      },
      dispose: () => {
        return;
      },
    };
    entry.client = client;
    entry.started = true;
    entry.starting = false;
    return Promise.resolve(client);
  };

  return { mgr, captures };
}

function getCapture(captures: Record<string, Capture>, id: string): Capture {
  const cap = captures[id];
  if (!cap) throw new Error(`Missing capture for ${id}`);
  return cap;
}

describe("LspManager", () => {
  let root: string;
  beforeEach(() => {
    root = makeProject();
  });

  it("prewarmHeuristics dryRun returns matching & existing command client ids", async () => {
    const { mgr } = createManager(root, new Set(["typescript", "markdown"]));
    const ids = await mgr.prewarmHeuristics({ dryRun: true });
    expect(ids.sort()).toEqual(["markdown", "ts"].sort());
  });

  it("prewarmHeuristics starts only intersecting language servers", async () => {
    const { mgr, captures } = createManager(root, new Set(["typescript", "markdown"]));
    const started = await mgr.prewarmHeuristics();
    expect(started.sort()).toEqual(["markdown", "ts"].sort());
    // Python not started
    expect(captures.py).toBeUndefined();
  });

  it("routes open/change/close notifications to matching client and versions increment", async () => {
    const { mgr, captures } = createManager(root, new Set(["typescript"]));
    // Start ts client lazily via open
    const file = path.join(root, "src", "file.ts");
    mkdirp(path.dirname(file));
    writeFileSync(file, "const a: number = 1;\n");

    // Access private method for deterministic test (avoids chokidar timing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(file);
    await waitFor(() => Boolean(captures.ts?.notifications.some((n) => n.method === "textDocument/didOpen")));
    const tsCap = getCapture(captures, "ts");
    const open = tsCap.notifications.find(
      (n): n is Extract<NotificationCapture, { method: typeof DidOpenTextDocumentNotification.method }> =>
        n.method === DidOpenTextDocumentNotification.method,
    );
    expect(open).toBeDefined();
    const uri = open!.params.textDocument.uri;
    expect(uri).toContain("file://");
    expect(open!.params.textDocument.version).toBe(1);

    // Change
    writeFileSync(file, "const a: number = 2;\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleChange(file);
    await waitFor(() => Boolean(captures.ts?.notifications.some((n) => n.method === "textDocument/didChange")));
    const change = tsCap.notifications.find(
      (n): n is Extract<NotificationCapture, { method: typeof DidChangeTextDocumentNotification.method }> =>
        n.method === DidChangeTextDocumentNotification.method,
    );
    expect(change).toBeDefined();
    expect(change!.params.textDocument.version).toBe(2);

    // Second change shouldn't start client again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleChange(file);
    await waitFor(
      () => getCapture(captures, "ts").notifications.filter((n) => n.method === "textDocument/didChange").length >= 2,
    );
    expect(tsCap.starts).toBe(1);

    // Close
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleClose(file);
    await waitFor(() =>
      Boolean(getCapture(captures, "ts").notifications.some((n) => n.method === "textDocument/didClose")),
    );
    const close = tsCap.notifications.find((n) => n.method === "textDocument/didClose");
    expect(close).toBeDefined();
  });

  it("emits didSave after didChange for changed file", async () => {
    const { mgr, captures } = createManager(root, new Set(["typescript"]));
    const file = path.join(root, "src", "saveTest.ts");
    mkdirp(path.dirname(file));
    writeFileSync(file, "export const a = 1;\n");
    // open
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(file);
    await waitFor(() => Boolean(captures.ts?.notifications.some((n) => n.method === "textDocument/didOpen")));
    // change triggers change + save
    writeFileSync(file, "export const a = 2;\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleChange(file);
    await waitFor(() =>
      Boolean(
        captures.ts?.notifications.some((n) => n.method === "textDocument/didChange") &&
          captures.ts?.notifications.some((n) => n.method === "textDocument/didSave"),
      ),
    );
    const methods = captures.ts?.notifications.map((n) => n.method) || [];
    const changeIdx = methods.indexOf("textDocument/didChange");
    const saveIdx = methods.indexOf("textDocument/didSave");
    expect(changeIdx).toBeGreaterThan(-1);
    expect(saveIdx).toBeGreaterThan(-1);
    expect(saveIdx).toBeGreaterThan(changeIdx); // save happens after change
  });

  it("supports alternative pattern language match (README -> markdown server)", async () => {
    const { mgr, captures } = createManager(root, new Set(["markdown"]));
    const readme = path.join(root, "README.md");
    writeFileSync(readme, "# Project\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(readme);
    await waitFor(() => Boolean(captures.markdown?.notifications.some((n) => n.method === "textDocument/didOpen")));
    expect(captures.markdown?.notifications.some((n) => n.method === "textDocument/didOpen")).toBeTrue();
  });

  it("aggregates diagnostics with current version", async () => {
    const { mgr, captures } = createManager(root, new Set(["typescript"]));
    const file = path.join(root, "index.ts");
    writeFileSync(file, "const x: number = 1;\n");
    // open -> version 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(file);
    await waitFor(() => Boolean(captures.ts?.notifications.some((n) => n.method === "textDocument/didOpen")));
    // change -> version 2
    writeFileSync(file, "const x: number = 2;\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleChange(file);
    await waitFor(() => Boolean(captures.ts?.notifications.some((n) => n.method === "textDocument/didChange")));

    // Simulate diagnostics publish from ts client
    const cap = captures.ts;
    expect(cap).toBeDefined();
    const openNote = cap.notifications.find(
      (n): n is Extract<NotificationCapture, { method: typeof DidOpenTextDocumentNotification.method }> =>
        n.method === DidOpenTextDocumentNotification.method,
    )!;
    const uri = openNote.params.textDocument.uri;
    // Fire handler (registered lazily in real impl; here we just emulate send path)
    // We didn't register onNotification in stubbed start so manually call private handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleDiagnostics("ts", {
      uri,
      diagnostics: [
        {
          message: "Example",
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          severity: 1,
          source: "ts",
        },
      ],
    });
    const diags = mgr.getDiagnostics(URI.parse(uri).fsPath)!;
    // Ensure version has incremented (change notification processed)
    expect(diags.version).toBe(2); // last change version
    expect(diags.all.length).toBe(1);
  });

  it("matches leading ./ pattern with glob wildcards", async () => {
    // Custom manager with a pattern including leading ./
    const configs: LspConfig[] = [
      {
        id: "tsglob",
        name: "TS Glob",
        cmd: "typescript-language-server",
        selector: [
          {
            language: "typescript",
            pattern: "./src/**/*.ts",
            scheme: "file",
          },
        ],
      },
    ];
    const captures: Record<string, Capture> = {};
    const mgr = new LspManager(configs, root, {
      commandExists: () => true,
      projectLanguagesFn: () => new Set(["typescript"]),
    });
    // Stub startClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).startClient = (entry: { id: string; started: boolean; starting: boolean; client?: unknown }) => {
      const id = entry.id;
      if (!captures[id]) {
        captures[id] = { notifications: [], handlers: {}, starts: 0 } as Capture;
      }
      const cap = captures[id];
      if (entry.started && entry.client) return Promise.resolve(entry.client);
      cap.starts++;
      const client = {
        sendNotification(method: string, params: unknown) {
          cap.notifications.push({ method, params });
        },
        onNotification(method: string, handler: (params: unknown) => void) {
          cap.handlers[method] = handler;
        },
        shutdown: async () => {},
        dispose: () => {},
      };
      entry.client = client;
      entry.started = true;
      entry.starting = false;
      return Promise.resolve(client);
    };

    const tsFile = path.join(root, "src", "nested", "file.ts");
    mkdirp(path.dirname(tsFile));
    writeFileSync(tsFile, "export const x = 1;\n");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(tsFile);
    await waitFor(() => Boolean(captures.tsglob?.notifications.some((n) => n.method === "textDocument/didOpen")));
    expect(captures.tsglob?.notifications.some((n) => n.method === "textDocument/didOpen")).toBeTrue();
  });

  it("matches pattern without leading ./ for standard ts files", async () => {
    const configs: LspConfig[] = [
      {
        id: "tsglob2",
        name: "TS Glob 2",
        cmd: "typescript-language-server",
        selector: [{ language: "typescript", pattern: "src/**/*.ts", scheme: "file" }],
      },
    ];
    const captures: Record<string, Capture> = {};
    const mgr = new LspManager(configs, root, {
      commandExists: () => true,
      projectLanguagesFn: () => new Set(["typescript"]),
    });
    // stub startClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).startClient = (entry: { id: string; started: boolean; starting: boolean; client?: unknown }) => {
      const id = entry.id;
      if (!captures[id]) captures[id] = { notifications: [], handlers: {}, starts: 0 } as Capture;
      const cap = captures[id];
      if (entry.started && entry.client) return Promise.resolve(entry.client);
      cap.starts++;
      const client = {
        sendNotification(method: string, params: unknown) {
          cap.notifications.push({ method, params });
        },
        onNotification(method: string, handler: (params: unknown) => void) {
          cap.handlers[method] = handler;
        },
        shutdown: async () => {},
        dispose: () => {},
      };
      entry.client = client;
      entry.started = true;
      entry.starting = false;
      return Promise.resolve(client);
    };
    const tsFile1 = path.join(root, "src", "deep", "a.ts");
    const tsFile2 = path.join(root, "src", "deep", "btest.ts");
    const tsFile3 = path.join(root, "src", "other", "another.ts");
    mkdirp(path.dirname(tsFile1));
    mkdirp(path.dirname(tsFile3));
    writeFileSync(tsFile1, "export const a=1;\n");
    writeFileSync(tsFile2, "export const b=2;\n");
    writeFileSync(tsFile3, "export const c=3;\n");
    // Access private handlers for deterministic test control
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(tsFile1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(tsFile2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mgr as any).handleOpen(tsFile3);
    await waitFor(() =>
      Boolean(captures.tsglob2?.notifications.filter((n) => n.method === "textDocument/didOpen").length === 3),
    );
    expect(captures.tsglob2?.notifications.filter((n) => n.method === "textDocument/didOpen").length).toBe(3);
  });
});

// Simple async tick helper (allow pending microtasks to flush)
function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function mkdirp(dir: string) {
  mkdirSync(dir, { recursive: true });
}

async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await tick();
  }
}
