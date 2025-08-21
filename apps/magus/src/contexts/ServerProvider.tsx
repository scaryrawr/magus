import React, { createContext, useContext, type ReactNode } from "react";
import type { Server } from "bun";

interface ServerState {
  server: Server;
}

interface ServerProviderProps {
  server: Server;
  children: ReactNode;
}

const ServerContext = createContext<ServerState | null>(null);

export const ServerProvider: React.FC<ServerProviderProps> = ({ server, children }) => {
  const serverState: ServerState = {
    server,
  };

  return <ServerContext.Provider value={serverState}>{children}</ServerContext.Provider>;
};

export const useServer = (): ServerState => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }

  return context;
};
