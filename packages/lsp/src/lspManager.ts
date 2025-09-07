import { gitignore } from "@magus/common-utils";
import chokidar from "chokidar";
import type { Ignore } from "ignore";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from "vscode-jsonrpc/node";
import {
  DidChangeTextDocumentNotification,
  DidCloseTextDocumentNotification,
  DidOpenTextDocumentNotification,
  type DocumentFilter,
  type DocumentSelector,
  type PublishDiagnosticsParams,
} from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { DiagnosticsStore, type FileDiagnostics } from "./diagnostics";
import { detectLanguage } from "./languages";
import { detectProjectLanguages as detectProjectLanguagesFn } from "./projectLanguages";

export interface LspConfig {
  id: string;
  name: string;
  cmd: string;
  args?: string[];
  selector: DocumentSelector;
}

interface RpcClient {
  sendNotification(method: string, params: unknown): void;
  onNotification(method: string, handler: (params: unknown) => void): void;
  shutdown(): Promise<void>;
  dispose(): void;
}

type ClientEntry = {
  id: string;
  selector: DocumentSelector;
  config: LspConfig;
  client?: RpcClient;
  started: boolean;
  starting: boolean;
  startPromise?: Promise<RpcClient>;
};

interface LspManagerOptions {
  commandExists?: (cmd: string) => boolean;
  projectLanguagesFn?: (rootDir: string) => Set<string>;
}

export class LspManager {
  private rootDir: string;
  private clients: ClientEntry[] = [];
  private versionMap = new Map<string, number>();
  private ignoreMatcher: Ignore;
  private diagnostics = new DiagnosticsStore();
  private openSent = new Set<string>(); // key: clientId|uri
  private commandExistsFn: (cmd: string) => boolean;
  private projectLanguagesFn: (rootDir: string) => Set<string>;

  constructor(configs: LspConfig[], rootDir: string = process.cwd(), opts: LspManagerOptions = {}) {
    this.rootDir = rootDir;
    this.ignoreMatcher = gitignore;
    this.commandExistsFn = opts.commandExists ?? this.defaultCommandExists;
    this.projectLanguagesFn = opts.projectLanguagesFn ?? ((rd) => detectProjectLanguagesFn(rd));
    this.clients = configs.map((cfg) => ({
      id: cfg.id,
      selector: cfg.selector,
      config: cfg,
      started: false,
      starting: false,
    }));
  }

  private startClient(entry: ClientEntry): Promise<RpcClient> {
    if (entry.started && entry.client) return Promise.resolve(entry.client);
    if (entry.starting && entry.startPromise) return entry.startPromise;
    const { id, config } = entry;
    const { cmd, args = [] } = config;

    entry.starting = true;

    const startPromise: Promise<RpcClient> = new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });

      child.on("error", (err) => {
        entry.starting = false;
        console.error(`Failed to spawn LSP server ${id}:`, err);
        reject(err);
      });

      if (!child.stdout || !child.stdin) {
        const err = new Error("Child process stdio not available");
        entry.starting = false;
        return reject(err);
      }

      const reader = new StreamMessageReader(child.stdout);
      const writer = new StreamMessageWriter(child.stdin);
      const connection: MessageConnection = createMessageConnection(reader, writer);

      const rpcClient: RpcClient = {
        sendNotification: (method, params) => {
          try {
            // fire-and-forget
            void connection.sendNotification(method, params as never);
          } catch (err) {
            console.error(`sendNotification failed (${id} ${method})`, err);
          }
        },
        onNotification: (method, handler) => connection.onNotification(method, handler),
        shutdown: async () => {
          try {
            await connection.sendRequest("shutdown");
            rpcClient.sendNotification("exit", undefined);
          } catch {
            // ignore shutdown errors
          }
        },
        dispose: () => {
          try {
            connection.dispose();
          } catch {
            // ignore dispose error
          }
          try {
            child.kill();
          } catch {
            // ignore kill error
          }
        },
      };

      entry.client = rpcClient;

      // Start listening before initialize
      connection.listen();

      const rootUri = URI.file(this.rootDir).toString();
      const initializeParams = {
        processId: process.pid,
        rootUri,
        capabilities: {},
        workspaceFolders: [{ uri: rootUri, name: path.basename(this.rootDir) }],
      };

      connection
        .sendRequest("initialize", initializeParams)
        .then(() => {
          void connection.sendNotification("initialized", {});
          // subscribe diagnostics
          rpcClient.onNotification("textDocument/publishDiagnostics", (params: unknown) => {
            if (params && typeof params === "object" && (params as PublishDiagnosticsParams).uri) {
              this.handleDiagnostics(id, params as PublishDiagnosticsParams);
            }
          });
          entry.started = true;
          entry.starting = false;

          child.on("exit", () => {
            entry.started = false;
          });
          resolve(rpcClient);
        })
        .catch((err) => {
          entry.starting = false;
          console.error(`Failed to initialize LSP client ${id}:`, err);
          try {
            connection.dispose();
          } catch {
            // ignore
          }
          try {
            child.kill();
          } catch {
            // ignore
          }
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });

    entry.startPromise = startPromise;
    return startPromise;
  }

  public startWatcher() {
    const watcher = chokidar.watch(this.rootDir, {
      ignored: (watchedPath) => {
        const rel = path.relative(this.rootDir, watchedPath);
        if (!rel || rel.startsWith("..")) return false;
        return this.ignoreMatcher.ignores(rel);
      },
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });

    watcher
      .on("add", (file) => this.handleOpen(file))
      .on("change", (file) => this.handleChange(file))
      .on("unlink", (file) => this.handleClose(file));
  }

  private handleOpen(file: string) {
    Bun.file(file)
      .text()
      .then((text) => {
        const uri = URI.file(file).toString();
        this.versionMap.set(uri, 1);
        this.routeToClients(file, (client) => {
          void client.sendNotification(DidOpenTextDocumentNotification.method, {
            textDocument: {
              uri,
              languageId: detectLanguage(file),
              version: 1,
              text,
            },
          });
        });
      })
      .catch((err) => {
        console.error(`Failed to read file on open: ${file}`, err);
      });
  }

  private handleChange(file: string) {
    Bun.file(file)
      .text()
      .then((text) => {
        const uri = URI.file(file).toString();
        const version = (this.versionMap.get(uri) || 1) + 1;
        this.versionMap.set(uri, version);
        this.routeToClients(file, (client) => {
          void client.sendNotification(DidChangeTextDocumentNotification.method, {
            textDocument: { uri, version },
            contentChanges: [{ text }],
          });
        });
      })
      .catch((err) => {
        console.error(`Failed to read file on change: ${file}`, err);
      });
  }

  private handleClose(file: string) {
    const uri = URI.file(file).toString();
    this.versionMap.delete(uri);
    this.routeToClients(file, (client) => {
      void client.sendNotification(DidCloseTextDocumentNotification.method, {
        textDocument: { uri },
      });
    });
  }

  private routeToClients(file: string, fn: (client: RpcClient) => void) {
    for (const entry of this.clients) {
      if (this.matchesSelector(file, entry.selector)) {
        void this.startClient(entry).then((client) => fn(client));
      }
    }
  }

  private matchesSelector(file: string, selector: DocumentSelector): boolean {
    const languageId = detectLanguage(file);

    const globToRegex = (pattern: string): RegExp => {
      // Escape regex chars except * and ? then replace * => .* and ? => .
      const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\\\*\*/g, ".*");
      const regexStr = escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".");
      return new RegExp(`^${regexStr}$`);
    };

    return selector.some((filter: string | DocumentFilter) => {
      if (typeof filter === "string") {
        return filter === languageId;
      }
      if (filter.language && filter.language !== languageId) return false;
      type PatFilter = { pattern?: string; scheme?: string };
      const pf = filter as PatFilter;
      if (pf.scheme && pf.scheme !== "file") return false;
      const pattern = pf.pattern;
      if (pattern) {
        const rel = path.relative(this.rootDir, file) || file;
        const rx = globToRegex(pattern);
        if (!rx.test(rel)) return false;
      }
      return true;
    });
  }

  private defaultCommandExists = (cmd: string): boolean => {
    if (cmd.includes(path.sep)) {
      try {
        return Bun.file(cmd).size >= 0;
      } catch {
        return false;
      }
    }
    return !!Bun.which(cmd);
  };

  private gatherClientLanguages(entry: ClientEntry): Set<string> {
    const langs = new Set<string>();
    for (const sel of entry.selector) {
      if (typeof sel === "string") langs.add(sel);
      else if (sel.language) langs.add(sel.language);
    }
    return langs;
  }

  // detectProjectLanguages logic extracted to projectLanguages.ts; kept injectable for tests

  /**
   * Pre-start likely-needed language servers based on simple project heuristics (presence of marker files).
   * Set dryRun=true to only compute which client ids would be started.
   * Returns list of client ids that were (or would be) started.
   */
  public async prewarmHeuristics(options: { dryRun?: boolean } = {}): Promise<string[]> {
    const projectLangs = this.projectLanguagesFn(this.rootDir);
    const toStart: ClientEntry[] = [];
    for (const entry of this.clients) {
      if (entry.started || entry.starting) continue;
      const clientLangs = this.gatherClientLanguages(entry);
      const intersects = Array.from(clientLangs).some((l) => projectLangs.has(l));
      if (!intersects) continue;
      // ensure command exists to avoid noisy failures
      if (!this.commandExistsFn(entry.config.cmd)) continue;
      toStart.push(entry);
    }
    if (options.dryRun) return toStart.map((e) => e.id);
    await Promise.all(toStart.map((e) => this.startClient(e).catch(() => undefined)));
    return toStart.map((e) => e.id);
  }

  private handleDiagnostics(clientId: string, params: PublishDiagnosticsParams) {
    const { uri, diagnostics } = params;
    const version = this.versionMap.get(uri);
    this.diagnostics.upsert(uri, clientId, diagnostics, version);
  }

  /** Return combined diagnostics for a URI (file path accepted). */
  public getDiagnostics(fileOrUri: string) {
    const uri = fileOrUri.startsWith("file://") ? fileOrUri : URI.file(fileOrUri).toString();
    return this.diagnostics.get(uri);
  }

  /** Subscribe to any diagnostics changes. Returns unsubscribe fn. */
  public onDiagnostics(listener: (fd: FileDiagnostics) => void) {
    return this.diagnostics.on((fd) => listener(fd));
  }

  /** Return ids of clients that have started */
  public getStartedClientIds(): string[] {
    return this.clients.filter((c) => c.started).map((c) => c.id);
  }

  /** Return ids of all configured clients */
  public getConfiguredClientIds(): string[] {
    return this.clients.map((c) => c.id);
  }

  /** Gracefully shutdown all started clients */
  public async shutdownAll() {
    const shuttingDown: Promise<void>[] = [];
    for (const entry of this.clients) {
      if (entry.started && entry.client) {
        shuttingDown.push(
          entry.client
            .shutdown()
            .catch(() => void 0)
            .then(() => {
              entry.client?.dispose();
              entry.started = false;
            }),
        );
      }
    }
    await Promise.all(shuttingDown);
  }
}
