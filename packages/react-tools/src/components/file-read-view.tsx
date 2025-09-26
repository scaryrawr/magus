import { Markdown } from "@magus/react";
import { highlight } from "cli-highlight";
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

  // Check if the file is a markdown file by extension
  const isMarkdown = useMemo(() => {
    const extension = path.split(".").pop()?.toLowerCase();
    return extension === "md" || extension === "markdown";
  }, [path]);

  const fileLines = useMemo(() => {
    if (isMarkdown) {
      // For markdown files, we'll render the content directly with Markdown component
      return content.split("\n");
    }
    try {
      return highlight(content, { language, ignoreIllegals: true }).split("\n");
    } catch {
      return content.split("\n");
    }
  }, [content, language, isMarkdown]);

  const numWidth = (range ? String(range.end).length : String(fileLines.length).length) + 1;
  const displayIcon = icon ?? "📖";

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>{displayIcon}</Text>
        <Text>{` Read ${path}`}</Text>
        {range ? <Text dimColor>{` [${range.start},${range.end}]`}</Text> : null}
      </Box>
      {isMarkdown ? (
        <Markdown>{content}</Markdown>
      ) : (
        fileLines.map((line, index) => (
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
        ))
      )}
    </Box>
  );
};
