import { Box } from "ink";
import React from "react";
import { ChatProvider } from "./contexts/ChatContext";
import { ModelProvider } from "./contexts/ModelContext";
import { RoutesProvider } from "./contexts/RoutesProvider";
import type { ServerState } from "./contexts/ServerProvider";
import { ServerProvider } from "./contexts/ServerProvider";
import { MagusRouterProvider } from "./routes";

type AppProps = {
  createMagusServer: () => ServerState;
};

export const App: React.FC<AppProps> = ({ createMagusServer }) => {
  return (
    <Box width="90%" flexDirection="column" alignItems="center">
      <ServerProvider createServer={createMagusServer}>
        <ModelProvider>
          <ChatProvider>
            <RoutesProvider>
              <MagusRouterProvider />
            </RoutesProvider>
          </ChatProvider>
        </ModelProvider>
      </ServerProvider>
    </Box>
  );
};
