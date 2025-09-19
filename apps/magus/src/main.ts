import { createMcpClients, createMcpToolSet, loadMcpConfigs } from "@magus/mcp";
import {
  createGlobTool,
  createSearchTool,
  createShellTool,
  createSplitEditorTool,
  createSplitTodoTool,
  createWebFetchTool,
} from "@magus/tools";
import { render } from "ink";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { stderr } from "node:process";
import { createElement } from "react";
import { App } from "./app";
import SYSTEM_PROMPT from "./codex.txt";
import { createMagusServer } from "./createMagusServer";
import { createProviders } from "./createProviders";

const MCP_CONFIG_PATHS = [
  // macOS
  join(process.env.HOME ?? "", "Library", "Application Support", "Code", "User", "mcp.json"),
  join(process.env.HOME ?? "", "Library", "Application Support", "Code - Insiders", "User", "mcp.json"),

  // Linux
  join(process.env.HOME ?? "", ".config", "Code", "User", "mcp.json"),
  join(process.env.HOME ?? "", ".config", "Code - Insiders", "User", "mcp.json"),

  // Windows
  join(process.env.APPDATA ?? "", "Code", "User", "mcp.json"),
  join(process.env.APPDATA ?? "", "Code - Insiders", "User", "mcp.json"),

  // Present Workspace
  join(process.cwd(), ".vscode", "mcp.json"),
];

mkdirSync(join(process.cwd(), ".magus", "logs"), { recursive: true });
const logs = createWriteStream(join(process.cwd(), ".magus", "logs", `${new Date().toISOString()}.log`));
stderr.write = logs.write.bind(logs);

// Default to loading MCP configs from common VS Code locations
const mcpConfig = await loadMcpConfigs(MCP_CONFIG_PATHS);
const mcpClients = await createMcpClients(mcpConfig);

try {
  const mcpTools = mcpClients ? await createMcpToolSet(...mcpClients) : {};

  const tools = {
    ...mcpTools,
    ...createSplitTodoTool(),
    ...createSplitEditorTool(),
    ...createSearchTool(),
    ...createGlobTool(),
    ...createWebFetchTool(),
    ...createShellTool({
      mode: "ephemeral",
    }),
  };

  const providers = createProviders();
  const result = render(
    createElement(App, {
      createMagusServer: () => createMagusServer({ tools, systemPrompt: SYSTEM_PROMPT, providers }),
    }),
  );

  await result.waitUntilExit();
} finally {
  await Promise.all([...(mcpClients ? mcpClients.map((client) => client.close()) : [])]);
}
