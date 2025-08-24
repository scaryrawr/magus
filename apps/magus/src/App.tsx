import type { Server } from "bun";
import React, { useEffect, useMemo } from "react";
import { RoutesProvider, ServerProvider } from "./contexts";
import { MagusRouterProvider } from "./routes";

export type AppProps = {
  createServer: () => Server;
};

export const App: React.FC<AppProps> = ({ createServer }) => {
  const server = useMemo(() => createServer(), [createServer]);
  useEffect(() => {
    return () => {
      server.stop();
    };
  }, [server]);

  return (
    <ServerProvider server={server}>
      <RoutesProvider>
        <MagusRouterProvider />
      </RoutesProvider>
    </ServerProvider>
  );
};
