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

// Internal shared manager so we can expose both a single (uber) tool and split command tools.
interface InternalTodoManager {
  add: (steps: { description: string; status?: TodoItem["status"] }[]) => TodoItem[];
  update: (states: { id: string; status: TodoItem["status"] }[]) => TodoItem[];
  list: () => TodoItem[];
  clear: () => TodoItem[];
  state: () => TodoItem[];
}

const createInternalManager = (): InternalTodoManager => {
  const todoItems: TodoItem[] = [];
  let nextId = 1;
  const generateId = () => (nextId++).toString();

  const enforceInProgress = () => {
    const allCompleted = todoItems.length > 0 && todoItems.every((t) => t.status === "completed");
    if (!allCompleted && todoItems.length > 0 && !todoItems.some((t) => t.status === "in_progress")) {
      const firstPending = todoItems.find((t) => t.status === "pending");
      if (firstPending) firstPending.status = "in_progress";
    }
  };

  return {
    add: (steps) => {
      todoItems.push(
        ...steps.map((s) => ({
          id: generateId(),
          description: s.description,
          status: s.status ?? "pending",
        })),
      );
      enforceInProgress();
      return todoItems;
    },
    update: (states) => {
      for (const state of states) {
        if (todoItems.find((step) => step.id === state.id) === undefined) {
          throw new Error(`Todo item with id ${state.id} not found.`);
        }
      }
      for (const state of states) {
        const todo = todoItems.find((t) => t.id === state.id);
        if (todo) todo.status = state.status;
      }
      enforceInProgress();
      return todoItems;
    },
    list: () => {
      enforceInProgress();
      return todoItems;
    },
    clear: () => {
      todoItems.length = 0;
      return todoItems;
    },
    state: () => todoItems,
  };
};

// Existing uber tool (command union)
export const createTodoTool = () => {
  const manager = createInternalManager();
  return {
    todo: tool({
      description:
        "Use this tool to track, manage, and think through steps needed to complete tasks. This tool enables you to create and track the status of steps needed to accomplish a larger task. You MUST use this tool when figuring out an ask from the user.",
      inputSchema: TodoInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (input): TodoOutput => {
        switch (input.command) {
          case "add":
            manager.add(input.steps);
            break;
          case "update":
            manager.update(input.states);
            break;
          case "list":
            manager.list();
            break;
          case "clear":
            manager.clear();
            break;
          default:
            throw new Error("Invalid command");
        }
        return { todos: manager.state() };
      },
    }),
  } as const satisfies ToolSet;
};

// Split tool input schemas (non-union) for environments that don't support unions.
export const TodoAddInputSchema = AddTodoInputSchema.omit({ command: true }).extend({
  steps: AddTodoInputSchema.shape.steps,
});
export const TodoUpdateInputSchema = UpdateTodoInputSchema.omit({ command: true }).extend({
  states: UpdateTodoInputSchema.shape.states,
});
export const TodoListInputSchema = z.object({ list: z.boolean().optional().describe("No-op input object (optional)") });
export const TodoClearInputSchema = z.object({
  clear: z.boolean().optional().describe("No-op input object (optional)"),
});

export const createSplitTodoTool = () => {
  const manager = createInternalManager();
  return {
    todo_add: tool({
      description: "Add new todo steps (split variant of the todo tool).",
      inputSchema: TodoAddInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (input): TodoOutput => ({ todos: manager.add(input.steps) }),
    }),
    todo_update: tool({
      description: "Update existing todo step statuses (split variant).",
      inputSchema: TodoUpdateInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (input): TodoOutput => ({ todos: manager.update(input.states) }),
    }),
    todo_list: tool({
      description: "List todo steps (split variant).",
      inputSchema: TodoListInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (): TodoOutput => ({ todos: manager.list() }),
    }),
    todo_clear: tool({
      description: "Clear all todo steps (split variant).",
      inputSchema: TodoClearInputSchema,
      outputSchema: TodoOutputSchema,
      execute: (): TodoOutput => ({ todos: manager.clear() }),
    }),
  } as const satisfies ToolSet;
};

export type SplitTodoToolSet = ReturnType<typeof createSplitTodoTool>;
export type UberTodoToolSet = ReturnType<typeof createTodoTool>;
export type TodoToolSet = SplitTodoToolSet & UberTodoToolSet;
