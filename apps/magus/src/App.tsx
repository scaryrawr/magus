import { createMemoryRouter, RouterProvider } from "react-router";
import { Chat, Exit, Home } from "./pages";

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
