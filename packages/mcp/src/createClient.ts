import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient } from "ai";
import dotenv from "dotenv";
import type { VscMcp, VscMcpServer } from "./types";

type ExtractByType<TUnion, TType> = TUnion extends { type: TType } ? TUnion : never;

const createStdioTransport = ({ command, args, env: envProps, envFile }: ExtractByType<VscMcpServer, "stdio">) => {
  // process.env can have possibly `undefined` values which makes the type incompatible dotenv and StdioClientTransport.
  const env = { ...process.env, ...envProps } as Record<string, string>;
  if (envFile) {
    const result = {};
    dotenv.config({ path: envFile, processEnv: result });
  }

  return new StdioClientTransport({
    command,
    args,
    env,
  });
};

const createSseTransport = ({ url, headers }: ExtractByType<VscMcpServer, "sse">) => {
  return new SSEClientTransport(new URL(url), {
    fetch: (input: string | URL | globalThis.Request, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        headers: { ...headers, ...init?.headers },
      });
    },
  });
};

const createHttpTransport = ({ url, headers }: ExtractByType<VscMcpServer, "http">) => {
  return new StreamableHTTPClientTransport(new URL(url), {
    fetch: (input: string | URL | globalThis.Request, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        headers: { ...headers, ...init?.headers },
      });
    },
  });
};

const createTransport = (server: VscMcpServer) => {
  switch (server.type) {
    case "stdio":
      return createStdioTransport(server);
    case "sse":
      return createSseTransport(server);
    case "http":
      return createHttpTransport(server);
  }
};

export const createMcpClient = (name: string, server: VscMcpServer) => {
  const transport = createTransport(server);
  return experimental_createMCPClient({ name, transport });
};

export const createMcpClients = async (mcpConfig: VscMcp) => {
  const servers = mcpConfig.servers;
  if (!servers) return undefined;
  const clients = await Promise.allSettled(
    Object.entries(servers).map(([name, server]) => createMcpClient(name, server)),
  );

  return clients.filter((c) => c.status === "fulfilled").map((c) => c.value);
};
