import { Box } from "ink";
import { Outlet } from "react-router";
import { InputBar, StatusBar } from "./components";

const InputSection: React.FC = () => {
  return (
    <Box flexDirection="column" width="100%">
      <InputBar />
      <StatusBar />
    </Box>
  );
};

export const Layout: React.FC = () => {
  return (
    <>
      <Outlet />
      <InputSection />
    </>
  );
};
