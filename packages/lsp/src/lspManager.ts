import { gitignore } from "@magus/common-utils";
import chokidar from "chokidar";
import type { Ignore } from "ignore";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DidChangeTextDocumentNotification,
  DidCloseTextDocumentNotification,
  DidOpenTextDocumentNotification,
  DidSaveTextDocumentNotification,
  type DocumentSelector,
  type PublishDiagnosticsParams,
} from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { DiagnosticsStore, type FileDiagnostics } from "./diagnostics";
import { detectLanguage } from "./languages";
import { detectProjectLanguages as detectProjectLanguagesFn } from "./projectLanguages";
import { spawnRpcClient, type SpawnedRpcClient } from "./rpcClient";
import { matchesSelector } from "./selector";

export interface LspConfig {
  id: string;
  name: string;
  cmd: string;
  args?: string[];
  selector: DocumentSelector;
}

type RpcClient = SpawnedRpcClient;

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
  // Removed unused openSent tracking; if reintroduced, ensure de-duplication logic for didOpen.
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
    const startPromise = spawnRpcClient({
      id,
      cmd,
      args,
      rootDir: this.rootDir,
      onDiagnostics: (params) => {
        if (params && typeof params === "object" && (params as PublishDiagnosticsParams).uri) {
          this.handleDiagnostics(id, params as PublishDiagnosticsParams);
        }
      },
    })
      .then((client) => {
        entry.client = client;
        entry.started = true;
        entry.starting = false;
        return client;
      })
      .catch((err) => {
        entry.starting = false;
        console.error(`Failed to initialize LSP client ${id}:`, err);
        throw err;
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
    readFile(file, 'utf8')
      .then((text) => {
        const uri = URI.file(file).toString();
        this.versionMap.set(uri, 1);
        this.routeToClients(file, (client) => {
          client.sendNotification(DidOpenTextDocumentNotification.method, {
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
    readFile(file, 'utf8')
      .then((text) => {
        const uri = URI.file(file).toString();
        const version = (this.versionMap.get(uri) || 1) + 1;
        this.versionMap.set(uri, version);
        this.routeToClients(file, (client) => {
          client.sendNotification(DidChangeTextDocumentNotification.method, {
            textDocument: { uri, version },
            contentChanges: [{ text }],
          });
          // Also emit didSave to support servers configured for on-save diagnostics only.
          client.sendNotification(DidSaveTextDocumentNotification.method, {
            textDocument: { uri, version },
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
      client.sendNotification(DidCloseTextDocumentNotification.method, {
        textDocument: { uri },
      });
    });
  }

  private routeToClients(file: string, fn: (client: RpcClient) => void) {
    for (const entry of this.clients) {
      if (this.matchesSelector(file, entry.selector)) {
        this.startClient(entry)
          .then((client) => fn(client))
          .catch((err) => {
            console.error(`Failed to start LSP client ${entry.id} for file ${file}:`, err);
          });
      }
    }
  }

  // Selector matching moved to selector.ts for testability and separation of concerns.
  private matchesSelector(file: string, selector: DocumentSelector): boolean {
    return matchesSelector(file, this.rootDir, selector);
  }

  private defaultCommandExists = (cmd: string): boolean => {
    if (cmd.includes(path.sep)) {
      try {
        return existsSync(cmd);
      } catch {
        return false;
      }
    }
    // Use cross-platform which equivalent
    try {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      execSync(`${whichCmd} "${cmd}"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
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
      // ensure command exists to anoisy failures
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
            .catch(() => 0)
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
