import { useStdoutDimensions } from "@magus/ink-ext";
import { Box } from "ink";
import { createMemoryRouter, RouterProvider } from "react-router";
import { InputBar } from "./components/InputBar";
import { InputProvider } from "./contexts/InputProvider";
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
  const dimensions = useStdoutDimensions();

  return (
    <InputProvider>
      <Box flexDirection="column" width={dimensions.columns} height={dimensions.rows - 1}>
        <Box flexDirection="column" flexGrow={1} width="100%">
          <RouterProvider router={router} />
        </Box>
        <InputBar />
      </Box>
    </InputProvider>
  );
};
