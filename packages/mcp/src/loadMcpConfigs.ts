import { existsSync } from "node:fs";
import { VscMcpSchema, type VscMcp } from "./types";

export const loadMcpConfigs = async (paths: string[]) => {
  const mcpConfigs = (
    await Promise.all(
      paths.filter(existsSync).map(async (config) => VscMcpSchema.safeParse(await Bun.file(config).json())),
    )
  )
    .filter((res) => res.success)
    .map((res) => res.data);

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
