import figlet, { type FigletOptions } from "figlet";
import { Text } from "ink";
import { useEffect, useState } from "react";

export type FigletTextProps = FigletOptions & { fontData?: string; children: string };

export const FigletText = ({ children, fontData, ...options }: FigletTextProps) => {
  const [text, setText] = useState(children);
  useEffect(() => {
    let disposed = false;
    if (options.font && fontData) figlet.parseFont(options.font, fontData);
    figlet
      .text(children, options)
      .then((text) => {
        if (disposed) return;
        setText(text);
      })
      .catch(() => {
        // no-op
      });
    return () => {
      disposed = true;
    };
  }, [children, fontData, options]);

  return <Text>{text}</Text>;
};
