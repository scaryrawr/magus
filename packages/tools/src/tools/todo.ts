import { tool, type ToolSet } from "ai";
import { z } from "zod";

const TodoStatusSchema = z.enum(["open", "complete", "cancelled"]).describe("The current status of the todo item");

const TodoItemSchema = z.object({
  id: z.string().describe("The unique identifier for the todo."),
  task: z.string().describe("The description of the task to perform to complete this todo item."),
  status: TodoStatusSchema,
});

type TodoItem = z.infer<typeof TodoItemSchema>;

const AddTodoInputSchema = z.object({
  command: z.literal("add").describe("Add a new todo item."),
  description: z.string().describe("The description of the task to perform to complete this todo item."),
});

const UpdateTodoInputSchema = z.object({
  command: z.literal("update").describe("Update the status of an existing todo item."),
  id: z.string().describe("The unique identifier of the todo to update."),
  status: TodoStatusSchema.describe("The new status of the todo item."),
});

const ListTodosInputSchema = z.object({
  command: z.literal("list").describe("List all todo items."),
});

const ClearTodosInputSchema = z.object({
  command: z.literal("clear").describe("Clear all todo items."),
});

export const TodoInputSchema = z.union([
  AddTodoInputSchema,
  UpdateTodoInputSchema,
  ListTodosInputSchema,
  ClearTodosInputSchema,
]);

const ListTodosOutputSchema = z.object({
  todos: z.array(TodoItemSchema),
  open_count: z.number().describe("The number of open todo items."),
  total_count: z.number().describe("The total number of todo items."),
});

export const TodoOutputSchema = ListTodosOutputSchema;
type TodoOutput = z.infer<typeof TodoOutputSchema>;

export const createTodoTool = () => {
  const todoItems: TodoItem[] = [];
  let nextId = 1;
  const generateId = () => (nextId++).toString();

  return {
    todo: tool({
      description: "A tool for managing a todo list. You can add, update, and list todo items.",
      inputSchema: TodoInputSchema,
      outputSchema: TodoOutputSchema,
      execute: async (input): Promise<TodoOutput> => {
        switch (input.command) {
          case "add": {
            const newTodo: TodoItem = {
              id: generateId(),
              task: input.description,
              status: "open",
            };
            todoItems.push(newTodo);
            break;
          }
          case "update": {
            const todo = todoItems.find((t) => t.id === input.id);
            if (!todo) {
              throw new Error(`Todo item with id ${input.id} not found.`);
            }
            todo.status = input.status;
            break;
          }
          case "list": {
            break;
          }
          case "clear": {
            todoItems.length = 0;
            break;
          }
          default:
            throw new Error("Invalid command");
        }

        return {
          todos: todoItems,
          total_count: todoItems.length,
          open_count: todoItems.filter((t) => t.status === "open").length,
        };
      },
    }),
  } as const satisfies ToolSet;
};

export type TodoToolSet = ReturnType<typeof createTodoTool>;
