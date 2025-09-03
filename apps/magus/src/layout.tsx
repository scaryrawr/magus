import { Box } from "ink";
import { Outlet } from "react-router";
import { InputBar } from "./components";
import { StatusBar } from "./components/StatusBar";
import { InputProvider } from "./contexts";

const ChatSection: React.FC = () => {
  return (
    <Box flexDirection="column">
      <InputBar />
      <StatusBar />
    </Box>
  );
};

export const Layout: React.FC = () => {
  return (
    <InputProvider>
      <Outlet />
      <ChatSection />
    </InputProvider>
  );
};
