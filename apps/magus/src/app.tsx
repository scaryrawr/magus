import React from "react";
import { RoutesProvider } from "./contexts";
import { MagusRouterProvider } from "./routes";

export const App: React.FC = () => {
  return (
    <RoutesProvider>
      <MagusRouterProvider />
    </RoutesProvider>
  );
};
