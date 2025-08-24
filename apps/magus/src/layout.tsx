import { useStdoutDimensions } from "@magus/ink-ext";
import { Box } from "ink";
import { Outlet } from "react-router";
import { InputBar } from "./components";
import { InputProvider } from "./contexts";

export const Layout: React.FC = () => {
  const dimensions = useStdoutDimensions();

  return (
    <InputProvider>
      <Box flexDirection="column" width={dimensions.columns} height={dimensions.rows - 1}>
        <Box flexDirection="column" flexGrow={1} width="100%">
          <Outlet />
        </Box>
        <InputBar />
      </Box>
    </InputProvider>
  );
};
