import { MemoryRouter, Routes, Route } from "react-router";
import { useApp } from "ink";
import { useCallback } from "react";
import { Chat, Home } from "./pages";

export const App = () => {
  const { exit } = useApp();

  const onExit = useCallback(() => {
    exit();
  }, [exit]);

  return (
    <MemoryRouter initialEntries={["/"]} initialIndex={0}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat onExit={onExit} />} />
      </Routes>
    </MemoryRouter>
  );
};
