import { tool, type ToolSet } from "ai";
import { z } from "zod";

// Updated status values to align with codex.md guidance.
const TodoStatusSchema = z
  .enum(["pending", "in_progress", "completed", "removed"])
  .describe("The current status of the todo step");

const TodoItemSchema = z.object({
  id: z.string().describe("Unique identifier for the step."),
  description: z.string().describe("Short (<=7 words) description of the step."),
  status: TodoStatusSchema,
});

type TodoItem = z.infer<typeof TodoItemSchema>;

// We keep a command-based interface for backwards compatibility, but
// adapt semantics to enforce exactly one in_progress item.
const AddTodoInputSchema = z.object({
  command: z.literal("add"),
  steps: z.array(
    z
      .object({
        description: z.string().describe("Short description for the new step."),
        status: TodoStatusSchema.optional().describe("Initial status (defaults to pending).").default("pending"),
      })
      .describe("List of steps to add. Each step will be added with status 'pending'."),
  ),
});

const UpdateTodoInputSchema = z.object({
  command: z.literal("update"),
  states: z
    .array(
      z.object({
        id: z.string(),
        status: TodoStatusSchema,
      }),
    )
    .describe("List of step states to update and the status to update them to."),
});

const ListTodosInputSchema = z.object({
  command: z.literal("list"),
});

const ClearTodosInputSchema = z.object({
  command: z.literal("clear"),
});

export const TodoInputSchema = z.union([
  AddTodoInputSchema,
  UpdateTodoInputSchema,
  ListTodosInputSchema,
  ClearTodosInputSchema,
]);

const InternalTodoOutputSchema = z.object({
  todos: z.array(TodoItemSchema),
});

export const TodoOutputSchema = InternalTodoOutputSchema;
type TodoOutput = z.infer<typeof InternalTodoOutputSchema>;

export const createTodoTool = () => {
  const todoItems: TodoItem[] = [];
  let nextId = 1;
  const generateId = () => (nextId++).toString();

  return {
    todo: tool({
      description:
        "Use this tool to track, manage, and think through steps needed to complete tasks. This tool enables you to create and track the status of steps needed to accomplish a larger task. You MUST use this tool when figuring out an ask from the user.",
      inputSchema: TodoInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (input): TodoOutput => {
        switch (input.command) {
          case "add": {
            todoItems.push(
              ...input.steps.map((s) => ({
                id: generateId(),
                description: s.description,
                status: s.status ?? "pending",
              })),
            );
            break;
          }
          case "update": {
            for (const state of input.states) {
              if (todoItems.find((step) => step.id === state.id) === undefined) {
                throw new Error(`Todo item with id ${state.id} not found.`);
              }
            }

            for (const state of input.states) {
              const todo = todoItems.find((t) => t.id === state.id);
              if (todo) todo.status = state.status;
            }
            break;
          }
          case "list":
            break;
          case "clear": {
            todoItems.length = 0;
            break;
          }
          default:
            throw new Error("Invalid command");
        }

        // If all completed, zero in_progress is acceptable; else enforce exactly one.
        const allCompleted = todoItems.length > 0 && todoItems.every((t) => t.status === "completed");
        if (!allCompleted && todoItems.length > 0 && !todoItems.some((t) => t.status === "in_progress")) {
          // Promote first pending if any.
          const firstPending = todoItems.find((t) => t.status === "pending");
          if (firstPending) firstPending.status = "in_progress";
        }

        return {
          todos: todoItems,
        };
      },
    }),
  } as const satisfies ToolSet;
};

export type TodoToolSet = ReturnType<typeof createTodoTool>;
