import type { ToolSet } from "ai";
import type { createMcpClient } from "./createClient";

export const createMcpToolSet = async (...servers: Awaited<ReturnType<typeof createMcpClient>>[]) => {
  const tools = await Promise.all(servers.map((server) => server.tools()));
  return tools.reduce((acc, tool) => {
    return { ...acc, ...tool };
  }, {}) satisfies ToolSet;
};
