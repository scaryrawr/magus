import { Text } from "ink";
import React from "react";
import stripAnsi from "strip-ansi";
import { createAnsiStreamParser, type AnsiSegment } from "../utils/ansi";

type AnsiTextProps = {
  children: string;
};

export const AnsiText: React.FC<AnsiTextProps> = ({ children }) => {
  const parser = React.useMemo(() => createAnsiStreamParser(), []);
  // Parse the entire string into segments
  const segments = React.useMemo(() => {
    parser.reset();
    const segs = parser.push(children);
    const tail = parser.flush();
    return [...segs, ...tail];
  }, [children, parser]);

  // Merge consecutive segments with identical style
  const merged = React.useMemo(() => {
    const result: AnsiSegment[] = [];
    for (const seg of segments) {
      const last = result[result.length - 1];
      if (last) {
        const sameStyle =
          last.color === seg.color &&
          last.backgroundColor === seg.backgroundColor &&
          last.bold === seg.bold &&
          last.underline === seg.underline &&
          last.italic === seg.italic &&
          last.strikethrough === seg.strikethrough &&
          last.dimColor === seg.dimColor &&
          last.inverse === seg.inverse;
        if (sameStyle) {
          last.text = stripAnsi((last.text ?? "") + seg.text);
          continue;
        }
      }
      // clone to avoid mutating original
      result.push({ ...seg });
    }
    return result;
  }, [segments]);

  return (
    <Text>
      {merged.map((seg, i) => (
        <Text
          key={i}
          color={seg.color}
          backgroundColor={seg.backgroundColor}
          bold={seg.bold}
          underline={seg.underline}
          italic={seg.italic}
          strikethrough={seg.strikethrough}
          dimColor={seg.dimColor}
          inverse={seg.inverse}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
};
