import { FigletText } from "@magus/ink-ext";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useRouteInput } from "../contexts";

export const Home = () => {
  const navigate = useNavigate();

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
    </Box>
  );
};
