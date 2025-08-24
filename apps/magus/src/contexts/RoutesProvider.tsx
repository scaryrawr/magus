import { createContext, useContext, useState } from "react";

type RoutesContext = {
  routes: string[];
  setRoutes: (routes: string[]) => void;
};

const RoutesContext = createContext<RoutesContext | null>(null);

type RoutesProviderProps = {
  children: React.ReactNode;
};

export const RoutesProvider: React.FC<RoutesProviderProps> = ({ children }) => {
  const [routes, setRoutes] = useState<string[]>([]);

  return <RoutesContext.Provider value={{ routes, setRoutes }}>{children}</RoutesContext.Provider>;
};

export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error("useRoutes must be used within a RoutesProvider");
  }

  return context;
};
