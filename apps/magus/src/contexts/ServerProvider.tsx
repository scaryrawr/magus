import type { ObservableServerState } from "@magus/server";
import type { Server } from "bun";
import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

type ServerState = {
  server: Server;
  state: ObservableServerState;
};

type ServerProviderProps = {
  children: ReactNode;
  createServer: () => ServerState;
};

const ServerContext = createContext<ServerState | null>(null);

export const ServerProvider: React.FC<ServerProviderProps> = ({ createServer, children }) => {
  const serverState = useMemo(() => createServer(), [createServer]);
  const { server } = serverState;

  useEffect(() => {
    return () => {
      server.stop();
    };
  }, [server]);

  return <ServerContext.Provider value={serverState}>{children}</ServerContext.Provider>;
};

export const useServerContext = (): ServerState => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }

  return context;
};
