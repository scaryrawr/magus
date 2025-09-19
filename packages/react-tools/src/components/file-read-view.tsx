import highlight from "cli-highlight";
import { Box, Text } from "ink";
import React, { useMemo } from "react";

type FileReadViewProps = {
  path: string;
  icon?: string;
  content: string;
  range?: { start: number; end: number };
};

export const FileReadView: React.FC<FileReadViewProps> = ({ path, icon, content, range }) => {
  const start = range?.start ?? 1;
  const language = path.split(".").pop() ?? undefined;
  const fileLines = useMemo(() => {
    try {
      return highlight(content, { language, ignoreIllegals: true }).split("\n");
    } catch {
      return content.split("\n");
    }
  }, [content, language]);

  const numWidth = (range ? String(range.end).length : String(fileLines.length).length) + 1;
  const displayIcon = icon ?? "📖";

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>{displayIcon}</Text>
        <Text>{` Read ${path}`}</Text>
        {range ? <Text dimColor>{` [${range.start},${range.end}]`}</Text> : null}
      </Box>
      {fileLines.map((line, index) => (
        <Box flexDirection="row" key={index}>
          <Box
            width={numWidth}
            borderDimColor
            borderStyle="single"
            borderBottom={false}
            borderTop={false}
            borderLeft={false}
          >
            <Text dimColor>{`${start + index}`}</Text>
          </Box>
          <Box paddingLeft={1}>
            <Text>{line}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
