import figlet, { type FigletOptions } from "figlet";
import { Text } from "ink";
import { useEffect, useState } from "react";

export type FigletTextProps = FigletOptions & { fontData?: string; children: string };

export const FigletText = (props: FigletTextProps) => {
  const { font, fontData, children } = props;
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (font && fontData) {
      figlet.parseFont(font, fontData);
    }

    setText(figlet.textSync(children, props));
  }, [children, font, fontData, props]);

  return <Text>{text}</Text>;
};
