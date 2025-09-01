import type { ToolSet, ToolUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";

export type MessagePart = UIMessagePart<UIDataTypes, UITools>;

export type UIToolProps = {
  part: MessagePart;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type ToolSetToUITools<TToolSet extends ToolSet> = Prettify<{
  [K in keyof TToolSet]: {
    input: TToolSet[K]["inputSchema"];
    output: TToolSet[K]["outputSchema"];
  };
}>;

export type ToolProp<T extends ToolSet> = {
  part: ToolUIPart<ToolSetToUITools<T>>;
};
