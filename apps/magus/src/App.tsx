import { useStdoutDimensions } from "@magus/ink-ext";
import type { Server } from "bun";
import { Box } from "ink";
import React, { useEffect, useMemo } from "react";
import { RouterProvider } from "react-router";
import { InputBar } from "./components/InputBar";
import { InputProvider, ServerProvider } from "./contexts";
import { router } from "./routes";

export type AppProps = {
  createServer: () => Server;
};

export const App: React.FC<AppProps> = ({ createServer }) => {
  const dimensions = useStdoutDimensions();
  const server = useMemo(() => createServer(), [createServer]);
  useEffect(() => {
    return () => {
      server.stop();
    };
  }, [server]);

  return (
    <ServerProvider server={server}>
      <InputProvider>
        <Box flexDirection="column" width={dimensions.columns} height={dimensions.rows - 1}>
          <Box flexDirection="column" flexGrow={1} width="100%">
            <RouterProvider router={router} />
          </Box>
          <InputBar />
        </Box>
      </InputProvider>
    </ServerProvider>
  );
};
