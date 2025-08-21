import { Box, Text, useInput } from "ink";
import { FigletText } from "@magus/ink-ext";
import { useNavigate } from "react-router";

export const Home = () => {
  const navigate = useNavigate();

  useInput((input, key) => {
    if (input === "c" || key.return) {
      navigate("/chat");
    }
    if (input === "q" || key.escape) {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <FigletText font="Standard">MAGUS</FigletText>
      <Text></Text>
      <Text>Press &apos;c&apos; or Enter to start chat</Text>
      <Text>Press &apos;q&apos; or Escape to quit</Text>
    </Box>
  );
};
