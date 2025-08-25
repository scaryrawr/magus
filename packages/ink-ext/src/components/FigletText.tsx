import type { Options } from "figlet";
import figlet from "figlet";
import { Text } from "ink";
import { useMemo } from "react";

export type FigletTextProps = Options & { children: string };

export const FigletText = (props: FigletTextProps) => {
  const { children, ...options } = props;
  const renderedText = useMemo(() => figlet.textSync(children, options), [children, options]);

  return <Text>{renderedText}</Text>;
};
