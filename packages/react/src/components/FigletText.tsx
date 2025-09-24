import figlet, { type FigletOptions } from "figlet";
import { Text } from "ink";
import { useEffect, useState } from "react";

export type FigletTextProps = FigletOptions & { fontData?: string; children: string };

export const FigletText = ({ children, fontData, ...options }: FigletTextProps) => {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (options.font && fontData) {
      figlet.parseFont(options.font, fontData);
    }

    setText(figlet.textSync(children, options));
  }, [children, fontData, options]);

  return <Text>{text}</Text>;
};
