import { TodoOutputSchema, type TodoToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box, Text } from "ink";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isTodoPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<TodoToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<TodoToolSet>>;
  return partCheck.type === "tool-todo";
};

export const TodoView: React.FC<UIToolProps> = ({ part }) => {
  if (!isTodoPart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { todos } = TodoOutputSchema.parse(part.output);
      return (
        <Box key={toolCallId} flexDirection="row">
          {todos.map((todo) => (
            <Text key={todo.id}>
              {todo.status === "pending"
                ? "🧊"
                : todo.status === "in_progress"
                  ? "🚀"
                  : todo.status === "removed"
                    ? "❌"
                    : "✅"}{" "}
              - {todo.description}
            </Text>
          ))}
        </Box>
      );
    }

    default:
      return null;
  }
};
