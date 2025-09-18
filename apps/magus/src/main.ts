import { createDefaultLspManager } from "@magus/lsp";
import { createMcpClients, createMcpToolSet, loadMcpConfigs } from "@magus/mcp";
import {
  createGlobTool,
  createLspDiagnosticsTool,
  createSearchTool,
  createShellTool,
  createSplitEditorTool,
  createSplitTodoTool,
  createWebFetchTool,
  type EditorOutputPlugin,
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

const lsp = createDefaultLspManager();

// Default to loading MCP configs from common VS Code locations
const mcpConfig = await loadMcpConfigs(MCP_CONFIG_PATHS);
const mcpClients = await createMcpClients(mcpConfig);

try {
  const mcpTools = mcpClients ? await createMcpToolSet(...mcpClients) : {};

  lsp.startWatcher();
  const plugins: EditorOutputPlugin = {
    diagnostics: (uri) => {
      const diagnostics = lsp.getDiagnostics(uri);
      if (!diagnostics) return "";
      const errors = diagnostics.all
        .map((d) => {
          const severityMap = {
            1: "ERROR",
            2: "WARN",
            3: "INFO",
            4: "HINT",
          };
          return `${severityMap[d.severity ?? 1]} [${uri}:${d.range.start.line + 1}:${d.range.start.character + 1}] ${d.message}`;
        })
        .join("\n")
        .trim();
      if (!errors) return "No issues found.";
      return `<diagnostic_errors>${errors}</diagnostic_errors>`;
    },
  };

  const tools = {
    ...mcpTools,
    ...createSplitTodoTool(),
    ...createSplitEditorTool(plugins),
    ...createSearchTool(),
    ...createGlobTool(),
    ...createWebFetchTool(),
    ...createShellTool({
      mode: "ephemeral",
    }),
    ...createLspDiagnosticsTool(lsp),
  };

  const providers = createProviders();
  const result = render(
    createElement(App, {
      createMagusServer: () => createMagusServer({ tools, systemPrompt: SYSTEM_PROMPT, providers }),
    }),
  );

  await result.waitUntilExit();
} finally {
  await Promise.all([...(mcpClients ? mcpClients.map((client) => client.close()) : []), lsp.shutdownAll()]);
}
