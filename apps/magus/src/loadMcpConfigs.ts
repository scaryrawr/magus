import { VscMcpSchema, type VscMcp } from "@magus/mcp";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

export const loadMcpConfigs = async (paths = MCP_CONFIG_PATHS) => {
  const mcpConfigs = await Promise.all(
    paths.filter(existsSync).map(async (config) => VscMcpSchema.parse(await Bun.file(config).json())),
  );

  return mcpConfigs.reduce<VscMcp>((acc, mcpConfig) => {
    if (!mcpConfig.servers) return acc;
    if (acc.servers) {
      acc.servers = { ...acc.servers, ...mcpConfig.servers };
    } else if (mcpConfig.servers) {
      acc.servers = { ...mcpConfig.servers };
    }

    if (acc.inputs) {
      acc.inputs = { ...acc.inputs, ...mcpConfig.inputs };
    } else if (mcpConfig.inputs) {
      acc.inputs = { ...mcpConfig.inputs };
    }

    return acc;
  }, {});
};
