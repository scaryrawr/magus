import { FigletText } from "@magus/react";
import stronger from "figlet/fonts/Stronger Than All";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { useRoutes } from "../contexts/RoutesProvider";

export const Banner = () => {
  const { routes } = useRoutes();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Gradient name="retro">
        <FigletText font="Stronger Than All" fontData={stronger}>
          MAGUS
        </FigletText>
      </Gradient>
      <Text></Text>
      <Text>Press Enter to start chat</Text>
      <Box flexDirection="column" justifyContent="flex-start">
        {routes.map(({ path, description, hidden }, index) => {
          if (hidden || !description) {
            return null;
          }
          return (
            <Box key={index} flexDirection="row" width="70%" justifyContent="space-evenly">
              <Text>{path}</Text>
              <Text> - </Text>
              <Text dimColor>{description}</Text>
            </Box>
          );
        })}
        <Box flexDirection="row" width="70%" justifyContent="space-evenly">
          <Text>/exit</Text>
          <Text> - </Text>
          <Text dimColor>Exit the application</Text>
        </Box>
      </Box>
    </Box>
  );
};
