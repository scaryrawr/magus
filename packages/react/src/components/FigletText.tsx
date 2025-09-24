import figlet, { type FontName } from "figlet";
import { Text } from "ink";
import { useEffect, useState } from "react";

export type FigletTextProps = {
  fontData?: string;
  children: string;
  font?: FontName;
  width?: number;
  whitespaceBreak?: boolean;
  printDirection?: -1 | 0 | 1;
  showHardBlanks?: boolean;
};

export const FigletText = ({
  children,
  fontData,
  font,
  width,
  whitespaceBreak,
  printDirection,
  showHardBlanks,
}: FigletTextProps) => {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (font && fontData) {
      figlet.parseFont(font, fontData);
    }

    setText(
      figlet.textSync(children, {
        font,
        width,
        whitespaceBreak,
        printDirection,
        showHardBlanks,
      }),
    );
  }, [children, font, fontData, width, whitespaceBreak, printDirection, showHardBlanks]);

  return <Text>{text}</Text>;
};
