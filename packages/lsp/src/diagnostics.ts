import type { Diagnostic } from "vscode-languageserver-protocol";

export interface FileDiagnostics {
  uri: string; // file URI
  // map of client id -> diagnostics from that client
  byClient: Record<string, Diagnostic[]>;
  // flattened diagnostics combined (unsorted)
  all: Diagnostic[];
  // version last updated (optional - from LspManager tracking)
  version?: number;
}

export type DiagnosticsListener = (file: FileDiagnostics) => void;

/**
 * DiagnosticsStore aggregates diagnostics per file across multiple LSP clients.
 * Consumers can subscribe to updates for any file. Intended to be owned by LspManager.
 */
export class DiagnosticsStore {
  private files = new Map<string, FileDiagnostics>();
  private listeners = new Set<DiagnosticsListener>();

  public upsert(uri: string, clientId: string, diagnostics: Diagnostic[], version?: number) {
    const current = this.files.get(uri) || { uri, byClient: {}, all: [] };
    current.byClient[clientId] = diagnostics;
    // rebuild flattened list (cheap relative to counts we expect)
    current.all = Object.values(current.byClient).flat();
    if (version !== undefined) current.version = version;
    this.files.set(uri, current);
    this.emit(current);
  }

  public clear(uri: string, clientId?: string) {
    const current = this.files.get(uri);
    if (!current) return;
    if (clientId) {
      delete current.byClient[clientId];
      current.all = Object.values(current.byClient).flat();
      if (current.all.length === 0) {
        this.files.delete(uri);
      }
    } else {
      this.files.delete(uri);
    }
    const updated = this.files.get(uri);
    if (updated) this.emit(updated);
  }

  public get(uri: string): FileDiagnostics | undefined {
    return this.files.get(uri);
  }

  public getAll(): FileDiagnostics[] {
    return Array.from(this.files.values());
  }

  public on(listener: DiagnosticsListener) {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  public off(listener: DiagnosticsListener) {
    this.listeners.delete(listener);
  }

  private emit(fd: FileDiagnostics) {
    for (const l of this.listeners) {
      try {
        l(fd);
      } catch (err) {
        console.error("diagnostics listener error", err);
      }
    }
  }
}
