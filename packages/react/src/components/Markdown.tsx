import type { CardinalOptions } from "cardinal";
import { Text } from "ink";
import { Marked, type MarkedExtension } from "marked";
import { markedTerminal, type TerminalRendererOptions } from "marked-terminal";
import { useMemo } from "react";

export type MarkdownProps = {
  children: string;
  options?: TerminalRendererOptions;
  highlightOptions?: CardinalOptions;
};

export const Markdown = ({ children, options, highlightOptions }: MarkdownProps) => {
  const markedInstance = useMemo(
    () => new Marked(markedTerminal(options, highlightOptions) as MarkedExtension),
    [highlightOptions, options],
  );

  const text = useMemo(() => markedInstance.parse(children.trimEnd()), [children, markedInstance]);
  return <Text>{text}</Text>;
};
