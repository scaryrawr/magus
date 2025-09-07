import { spawn } from "node:child_process";
import path from "node:path";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from "vscode-jsonrpc/node";
import { URI } from "vscode-uri";

export interface SpawnedRpcClient {
  sendNotification(method: string, params: unknown): void;
  onNotification(method: string, handler: (params: unknown) => void): void;
  shutdown(): Promise<void>;
  dispose(): void;
}

export interface SpawnClientOptions {
  id: string;
  cmd: string;
  args: string[];
  rootDir: string;
  onDiagnostics?: (params: unknown) => void;
}

/** Spawn an LSP server process and initialize JSON-RPC connection. */
export function spawnRpcClient(opts: SpawnClientOptions): Promise<SpawnedRpcClient> {
  const { id, cmd, args, rootDir, onDiagnostics } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    child.on("error", (err) => reject(err));
    if (!child.stdout || !child.stdin) return reject(new Error("Child process stdio not available"));
    const reader = new StreamMessageReader(child.stdout);
    const writer = new StreamMessageWriter(child.stdin);
    const connection: MessageConnection = createMessageConnection(reader, writer);
    const rpcClient: SpawnedRpcClient = {
      sendNotification: (method, params) => {
        connection.sendNotification(method, params).catch((err) => {
          console.error(`sendNotification failed (${id} ${method})`, err);
        });
      },
      onNotification: (method, handler) => connection.onNotification(method, handler),
      shutdown: async () => {
        try {
          await connection.sendRequest("shutdown");
          rpcClient.sendNotification("exit", undefined);
        } catch {
          // ignore
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
    connection.listen();
    const rootUri = URI.file(rootDir).toString();
    const initializeParams = {
      processId: process.pid,
      rootUri,
      rootPath: rootDir,
      capabilities: {
        textDocument: {
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: { valueSet: [1, 2] },
            versionSupport: true,
          },
        },
      },
      workspaceFolders: [{ uri: rootUri, name: path.basename(rootDir) }],
    };

    if (onDiagnostics) {
      rpcClient.onNotification("textDocument/publishDiagnostics", onDiagnostics);
    }

    connection
      .sendRequest("initialize", initializeParams)
      .then(() => {
        try {
          void connection.sendNotification("initialized", {});
        } catch {
          // ignore initialized notification failure
        }
        child.on("exit", () => {
          // noop; LspManager maintains started state
        });
        resolve(rpcClient);
      })
      .catch((err) => {
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
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}
