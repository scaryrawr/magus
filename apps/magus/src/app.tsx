import { Box } from "ink";
import React from "react";
import { RoutesProvider, ServerProvider } from "./contexts";
import type { ServerState } from "./contexts/ServerProvider";
import { MagusRouterProvider } from "./routes";

type AppProps = {
  createMagusServer: () => ServerState;
};

export const App: React.FC<AppProps> = ({ createMagusServer }) => {
  return (
    <Box width="90%" flexDirection="column" alignItems="center">
      <ServerProvider createServer={createMagusServer}>
        <RoutesProvider>
          <MagusRouterProvider />
        </RoutesProvider>
      </ServerProvider>
    </Box>
  );
};
