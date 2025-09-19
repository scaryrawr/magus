import { Box, Text } from "ink";
import React from "react";

type DirectoryReadViewProps = {
  path: string;
  icon?: string;
  content: string;
};

export const DirectoryReadView: React.FC<DirectoryReadViewProps> = ({ path, icon, content }) => {
  const displayIcon = icon ?? "📁";
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>{displayIcon}</Text>
        <Text>{` Dir ${path}`}</Text>
      </Box>
      <Text>{content}</Text>
    </Box>
  );
};
