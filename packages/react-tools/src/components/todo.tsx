import { TodoOutputSchema, type TodoToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box, Text } from "ink";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isTodoPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<TodoToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<TodoToolSet>>;
  return partCheck.type.startsWith("tool-todo");
};

export const TodoView: React.FC<UIToolProps> = ({ part }) => {
  if (!isTodoPart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { todos } = TodoOutputSchema.parse(part.output);
      return (
        <Box key={toolCallId} flexDirection="column">
          <Text bold>📝 To Do List:</Text>
          <Box paddingLeft={2} paddingTop={1} flexDirection="column">
            {todos.map((todo) => (
              <Text key={todo.id}>
                {todo.status === "pending"
                  ? "🧊"
                  : todo.status === "in_progress"
                    ? "⏳"
                    : todo.status === "removed"
                      ? "❌"
                      : "✅"}{" "}
                - {todo.description}
              </Text>
            ))}
          </Box>
        </Box>
      );
    }

    default:
      return null;
  }
};
