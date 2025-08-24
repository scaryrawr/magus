import type { ObservableServerState } from "@magus/server";
import type { Server } from "bun";
import React, { createContext, useContext, type ReactNode } from "react";

type ServerState = {
  server: Server;
  state: ObservableServerState;
};

type ServerProviderProps = ServerState & {
  children: ReactNode;
};

const ServerContext = createContext<ServerState | null>(null);

export const ServerProvider: React.FC<ServerProviderProps> = ({ server, state, children }) => {
  const serverState: ServerState = {
    server,
    state,
  };

  return <ServerContext.Provider value={serverState}>{children}</ServerContext.Provider>;
};

export const useServerContext = (): ServerState => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }

  return context;
};
