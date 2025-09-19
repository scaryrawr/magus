import { parse } from "jsonc-parser";
import { existsSync } from "node:fs";
import { ZodError, type ZodSafeParseResult } from "zod";
import { VscMcpSchema, type VscMcp } from "./types";

export const loadMcpConfigs = async (paths: string[]) => {
  const mcpConfigs = (
    await Promise.all(
      paths.filter(existsSync).map(async (config) => {
        try {
          // If we fail to load/parse the config file, we just skip it. Should not be a fatal error.
          return VscMcpSchema.safeParse(parse(await Bun.file(config).text()));
        } catch {
          return {
            success: false,
            error: new ZodError([
              {
                code: "custom",
                message: `Failed to parse JSONC in ${config}`,
                path: [config],
              },
            ]),
          } satisfies ZodSafeParseResult<unknown>;
        }
      }),
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

    if (mcpConfig.inputs) {
      if (acc.inputs) {
        acc.inputs = [...acc.inputs, ...mcpConfig.inputs];
      } else {
        acc.inputs = [...mcpConfig.inputs];
      }
    }

    return acc;
  }, {});
};
