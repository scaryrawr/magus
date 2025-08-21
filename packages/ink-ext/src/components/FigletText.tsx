import { Text } from "ink";
import { useState, useEffect } from "react";
import type { Options } from "figlet";

export type FigletTextProps = Options & { children: string };

export const FigletText = (props: FigletTextProps) => {
  const { children, ...options } = props;
  const [renderedText, setRenderedText] = useState(children);

  useEffect(() => {
    const loadFiglet = async () => {
      try {
        // Use dynamic import for better ESM compatibility
        const { default: figlet } = await import("figlet");
        const text = figlet.textSync(children, options);
        setRenderedText(text);
      } catch {
        // Fallback if figlet fails to load
        setRenderedText(children);
      }
    };

    loadFiglet();
  }, [children, options]);

  return <Text>{renderedText}</Text>;
};
