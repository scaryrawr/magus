import { createMemoryRouter, RouterProvider } from "react-router";
import { Box, useApp } from "ink";
import { useEffect } from "react";
import { Chat, Home } from "./pages";

const Exit = () => {
  const { exit } = useApp();
  useEffect(() => {
    exit();
  }, [exit]);
  return <Box></Box>;
};

const router = createMemoryRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/chat",
    element: <Chat />,
  },
  {
    path: "/exit",
    element: <Exit />,
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
