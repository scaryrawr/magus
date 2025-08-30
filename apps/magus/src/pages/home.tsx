import { FigletText } from "@magus/react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useRouteInput, useRoutes } from "../contexts";

export const Home = () => {
  const navigate = useNavigate();
  const { routes } = useRoutes();

  const onSubmit = useCallback(
    (text: string) => {
      navigate("/chat", {
        state: { text },
      });
    },
    [navigate],
  );

  useRouteInput({
    onSubmit,
    placeholder: "Press Enter to start chatting",
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Gradient name="retro">
        <FigletText font="Stronger Than All">MAGUS</FigletText>
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
      </Box>
    </Box>
  );
};
