import figlet, { type FontName } from "figlet";
import { Text } from "ink";
import { useMemo } from "react";

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
  useMemo(() => {
    if (font && fontData) {
      figlet.parseFont(font, fontData);
    }
  }, [font, fontData]);

  const text = useMemo(
    () =>
      figlet.textSync(children, {
        font,
        width,
        whitespaceBreak,
        printDirection,
        showHardBlanks,
      }),
    [children, font, width, whitespaceBreak, printDirection, showHardBlanks],
  );

  return <Text>{text}</Text>;
};
