import React, { createContext, useContext, useEffect, type ReactNode } from "react";
import type { MagusClient } from "../createMagusServer";

// Generic server interface to avoid dependency on specific runtime
interface ServerLike {
  stop(): Promise<void>;
  url: URL;
}

export type ServerState = {
  client: MagusClient;
  server: ServerLike;
};

type ServerProviderProps = {
  children: ReactNode;
  createServer: () => ServerState;
};

const ServerContext = createContext<ServerState | null>(null);

export const ServerProvider: React.FC<ServerProviderProps> = ({ createServer, children }) => {
  const serverState = React.useMemo(() => createServer(), [createServer]);

  useEffect(() => {
    return () => {
      // Explicitly ignore any returned promise (if any) from stop
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      serverState.server.stop();
    };
  }, [serverState.server]);

  return <ServerContext.Provider value={serverState}>{children}</ServerContext.Provider>;
};

export const useServerContext = (): ServerState => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }

  return context;
};
