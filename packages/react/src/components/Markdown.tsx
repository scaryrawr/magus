import type { CardinalOptions } from "cardinal";
import { Text } from "ink";
import { marked, type MarkedExtension } from "marked";
import { markedTerminal, type TerminalRendererOptions } from "marked-terminal";

export type MarkdownProps = {
  children: string;
  options?: TerminalRendererOptions;
  highlightOptions?: CardinalOptions;
};

export const Markdown = ({ children, options, highlightOptions }: MarkdownProps) => {
  marked.use(markedTerminal(options, highlightOptions) as MarkedExtension);
  return <Text>{marked.parse(children.trimEnd())}</Text>;
};
