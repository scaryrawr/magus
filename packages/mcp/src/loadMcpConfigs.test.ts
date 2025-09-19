import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMcpConfigs } from "./loadMcpConfigs";

// Helper to create a temp config file with provided filename + content
function createConfigFile(dir: string, name: string, content: string) {
  const file = join(dir, name);
  writeFileSync(file, content, "utf8");
  return file;
}

describe("loadMcpConfigs", () => {
  it("merges multiple valid configurations (override servers, concat inputs)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-valid-"));
    const file1 = createConfigFile(
      dir,
      "config1.jsonc",
      `{
        // first config with two servers and two inputs
        "servers": {
          "one": { "type": "stdio", "command": "cmd1" },
          "shared": { "type": "stdio", "command": "old" }
        },
        "inputs": [ { "foo": 1 }, 42 ]
      }`,
    );
    const file2 = createConfigFile(
      dir,
      "config2.jsonc",
      `{
        // second config overrides 'shared' and adds new server + input
        "servers": {
          "shared": { "type": "stdio", "command": "new" },
          "two": { "type": "sse", "url": "https://example.com/stream" }
        },
        "inputs": [ "extra" ]
      }`,
    );

    const merged = await loadMcpConfigs([file1, file2]);

    expect(merged.servers).toBeDefined();
    expect(Object.keys(merged.servers || {})).toEqual(["one", "shared", "two"]);
    expect(merged.servers?.shared).toEqual({ type: "stdio", command: "new" }); // override
    // Expect inputs concatenated preserving order from each file
    expect(merged.inputs).toEqual([{ foo: 1 }, 42, "extra"]);
  });

  it("skips invalid configurations (schema + parse errors) while loading valid ones", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-mixed-"));
    const valid = createConfigFile(
      dir,
      "valid.jsonc",
      `{
        "servers": {
          "alpha": { "type": "stdio", "command": "run-alpha" }
        },
        "inputs": [ "one" ]
      }`,
    );
    // Invalid schema: discriminator 'type' wrong
    const invalidSchema = createConfigFile(
      dir,
      "invalid-schema.jsonc",
      `{
        "servers": {
          "bad": { "type": "invalid", "command": "noop" }
        }
      }`,
    );
    // Invalid JSONC: truncated file
    const invalidParse = createConfigFile(dir, "invalid-parse.jsonc", `{ unquoted: true }`);

    const result = await loadMcpConfigs([valid, invalidSchema, invalidParse]);

    expect(result.servers).toBeDefined();
    expect(Object.keys(result.servers || {})).toEqual(["alpha"]);
    expect(result.inputs).toEqual(["one"]);
  });

  it("returns empty object when all configurations are invalid", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-all-invalid-"));
    const invalidSchema = createConfigFile(
      dir,
      "invalid-schema.jsonc",
      `{"servers": { "bad": { "type": "nope", "command": "x" } }}`,
    );
    const invalidParse = createConfigFile(dir, "invalid-parse.jsonc", `{ unquoted: true }`);

    const result = await loadMcpConfigs([invalidSchema, invalidParse]);

    expect(result).toEqual({});
  });
});
