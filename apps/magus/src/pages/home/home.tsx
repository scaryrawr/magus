import { FigletText } from "@magus/ink-ext";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useRouteInput } from "../../contexts/InputProvider";

export const Home = () => {
  const navigate = useNavigate();

  const onSubmit = useCallback(
    (text: string) => {
      if (!text) {
        navigate("/chat");
        return;
      }

      if (text === "/exit") {
        navigate("/exit");
        return;
      }
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
        <FigletText font="Standard">MAGUS</FigletText>
      </Gradient>
      <Text></Text>
      <Text>Press Enter to start chat</Text>
      <Text>Press &apos;q&apos; or Escape to quit</Text>
    </Box>
  );
};
