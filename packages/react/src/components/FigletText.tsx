import figlet, { type FigletOptions } from "figlet";
import { Text } from "ink";

export type FigletTextProps = FigletOptions & { fontData?: string; children: string };

export const FigletText = ({ children, fontData, ...options }: FigletTextProps) => {
  if (options.font && fontData) figlet.parseFont(options.font, fontData);
  const result = figlet.textSync(children, options);
  return <Text>{result}</Text>;
};
