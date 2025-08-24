import type { ObservableServerState } from "@magus/server";
import type { Server } from "bun";
import React, { useEffect, useMemo } from "react";
import { RoutesProvider, ServerProvider } from "./contexts";
import { MagusRouterProvider } from "./routes";

export type ServerResults = {
  server: Server;
  state: ObservableServerState;
};

export type AppProps = {
  createServer: () => ServerResults;
};

export const App: React.FC<AppProps> = ({ createServer }) => {
  const { server, state } = useMemo(() => createServer(), [createServer]);
  useEffect(() => {
    return () => {
      server.stop();
    };
  }, [server]);

  return (
    <ServerProvider server={server} state={state}>
      <RoutesProvider>
        <MagusRouterProvider />
      </RoutesProvider>
    </ServerProvider>
  );
};
