import { useStdoutDimensions } from "@magus/react";
import { Box, measureElement, type DOMElement } from "ink";
import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { InputBar } from "./components";
import { StatusBar } from "./components/StatusBar";
import { InputProvider, useInputContext } from "./contexts";

const ChatSection: React.FC = () => {
  const { value, setInputAreaHeight } = useInputContext();
  const containerRef = useRef<DOMElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const { height } = measureElement(containerRef.current);
    setInputAreaHeight(height);
  }, [setInputAreaHeight, value]);

  return (
    <Box ref={containerRef} flexDirection="column" width="100%">
      <InputBar />
      <StatusBar />
    </Box>
  );
};

export const Layout: React.FC = () => {
  const dimensions = useStdoutDimensions();
  return (
    <InputProvider>
      <Box flexDirection="column" width={dimensions.columns} height={dimensions.rows - 1}>
        <Box flexDirection="column" flexGrow={1} width="100%">
          <Outlet />
        </Box>
        <ChatSection />
      </Box>
    </InputProvider>
  );
};
