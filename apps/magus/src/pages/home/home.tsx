import { FigletText } from "@magus/ink-ext";
import { Box, Text, useInput } from "ink";
import Gradient from "ink-gradient";
import { useNavigate } from "react-router";
import { useRouteInput } from "../../contexts/InputProvider";

export const Home = () => {
  const navigate = useNavigate();

  useInput((input, key) => {
    if (key.escape || input === "q") {
      process.exit(0);
    }
  });

  useRouteInput({
    onSubmit: () => navigate("/chat"),
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
