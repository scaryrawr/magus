import { createMemoryRouter } from "react-router";
import { Chat, Exit, Home } from "./pages";

export const router = createMemoryRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/chat",
    children: [{ index: true, Component: Chat }],
  },
  {
    path: "/exit",
    Component: Exit,
  },
]);
