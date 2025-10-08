import { beforeEach, describe, expect, it } from "bun:test";
import { insertHumanInTheLoop } from "./hitl";
import { createShellTool } from "./tools/shell";

describe("should be able to create hitl with existing tool", () => {
  let toolExecutes: ReturnType<typeof insertHumanInTheLoop>["toolExecutes"];
  let toolSet: ReturnType<typeof insertHumanInTheLoop>["toolSet"];
  beforeEach(() => {
    const hitl = insertHumanInTheLoop({ ...createShellTool() }, ["shell"]);
    toolExecutes = hitl.toolExecutes;
    toolSet = hitl.toolSet;
  });

  it("should no longer have an execute", () => {
    expect(toolExecutes.shell).toBeDefined();
    expect(toolSet.shell?.execute).toBeUndefined();
  });

  it("should be able to call the execute", async () => {
    expect(toolExecutes.shell).toBeDefined();
    expect(toolExecutes.shell).toBeTypeOf("function");
    const result = await toolExecutes.shell?.(
      { command: "echo hello" },
      {
        messages: [],
        toolCallId: "1",
      },
    );
    expect(result).toBeDefined();
    expect(result?.stdout.trim()).toBe("hello");
  });
});
