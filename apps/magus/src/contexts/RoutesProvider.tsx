import { createContext, useContext, useState } from "react";

export type RouteInfo = {
  path: string;
  description: string | undefined;
  hidden?: boolean;
};

type RoutesContext = {
  routes: RouteInfo[];
  setRoutes: (routes: RouteInfo[]) => void;
};

const RoutesContext = createContext<RoutesContext | null>(null);

type RoutesProviderProps = {
  children: React.ReactNode;
};

export const RoutesProvider: React.FC<RoutesProviderProps> = ({ children }) => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);

  return <RoutesContext.Provider value={{ routes, setRoutes }}>{children}</RoutesContext.Provider>;
};

export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error("useRoutes must be used within a RoutesProvider");
  }

  return context;
};
