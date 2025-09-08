import { describe, expect, it } from "bun:test";
import { z } from "zod";
import * as tt from "./tools";

type TodoOutput = z.infer<typeof tt.TodoOutputSchema>;
type TodoItem = TodoOutput["todos"][number];

async function unwrap<T extends TodoOutput | AsyncIterable<T>>(val: T | AsyncIterable<T>): Promise<TodoOutput> {
  if (val && typeof val === "object" && Symbol.asyncIterator in val) {
    let last: TodoOutput | undefined;
    for await (const chunk of val as AsyncIterable<TodoOutput>) last = chunk;
    if (!last) throw new Error("No chunks produced");
    return last;
  }
  return val;
}

describe("todo uber tool", () => {
  const { todo } = tt.createTodoTool();

  it("adds steps and auto-promotes first to in_progress", async () => {
    const input = { command: "add", steps: [{ description: "step one" }, { description: "step two" }] } as const;
    const parsed = tt.TodoInputSchema.parse(input);
    const executed = await todo.execute?.(parsed, { messages: [], toolCallId: "1" });
    const out = await unwrap(executed!);
    expect(out.todos).toHaveLength(2);
    expect(out.todos[0].status).toBe("in_progress");
    expect(out.todos[1].status).toBe("pending");
  });

  it("promotes next pending when current completed", async () => {
    const update = { command: "update", states: [{ id: "1", status: "completed" }] } as const;
    const executed = await todo.execute?.(tt.TodoInputSchema.parse(update), { messages: [], toolCallId: "2" });
    const out = await unwrap(executed!);
    const t1 = out.todos.find((t: TodoItem) => t.id === "1");
    const t2 = out.todos.find((t: TodoItem) => t.id === "2");
    expect(t1?.status).toBe("completed");
    expect(t2?.status).toBe("in_progress");
  });

  it("clears steps", async () => {
    const executed = await todo.execute?.(tt.TodoInputSchema.parse({ command: "clear" }), {
      messages: [],
      toolCallId: "3",
    });
    const out = await unwrap(executed!);
    expect(out.todos).toHaveLength(0);
  });
});

describe("todo split tools", () => {
  const split = tt.createSplitTodoTools();
  const { todo_add, todo_update, todo_list, todo_clear } = split;

  it("adds and auto-promotes", async () => {
    const addInput = tt.TodoAddInputSchema.parse({ steps: [{ description: "a" }, { description: "b" }] });
    const executed = await todo_add.execute?.(addInput, { messages: [], toolCallId: "4" });
    const out = await unwrap(executed!);
    expect(out.todos).toHaveLength(2);
    expect(out.todos[0].status).toBe("in_progress");
    expect(out.todos[1].status).toBe("pending");
  });

  it("update promotes next", async () => {
    const listExec = await todo_list.execute?.({}, { messages: [], toolCallId: "5" });
    const listBefore = await unwrap(listExec!);
    const first = listBefore.todos[0];
    const second = listBefore.todos[1];
    const updInput = tt.TodoUpdateInputSchema.parse({ states: [{ id: first.id, status: "completed" }] });
    const updExec = await todo_update.execute?.(updInput, { messages: [], toolCallId: "6" });
    const out = await unwrap(updExec!);
    const t1 = out.todos.find((t: TodoItem) => t.id === first.id)!;
    const t2 = out.todos.find((t: TodoItem) => t.id === second.id)!;
    expect(t1.status).toBe("completed");
    expect(t2.status).toBe("in_progress");
  });

  it("all completed then add new sets new in_progress", async () => {
    const listExec2 = await todo_list.execute?.({}, { messages: [], toolCallId: "7" });
    const list = await unwrap(listExec2!);
    const remaining = list.todos.filter((t) => t.status !== "completed");
    if (remaining.length) {
      const updInput = tt.TodoUpdateInputSchema.parse({
        states: remaining.map((r) => ({ id: r.id, status: "completed" })),
      });
      const updAllExec = await todo_update.execute?.(updInput, { messages: [], toolCallId: "8" });
      await unwrap(updAllExec!);
    }
    const addInput = tt.TodoAddInputSchema.parse({ steps: [{ description: "new" }] });
    const execAdd = await todo_add.execute?.(addInput, { messages: [], toolCallId: "9" });
    const out = await unwrap(execAdd!);
    const newly = out.todos.find((t: TodoItem) => t.description === "new");
    expect(newly?.status).toBe("in_progress");
  });

  it("clears", async () => {
    const execClear = await todo_clear.execute?.({}, { messages: [], toolCallId: "10" });
    const out = await unwrap(execClear!);
    expect(out.todos).toHaveLength(0);
  });
});
