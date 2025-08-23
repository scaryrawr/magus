import { Box, Text, measureElement, type DOMElement } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useRef } from "react";
import { useInputContext } from "../contexts/InputProvider";

export const InputBar: React.FC = () => {
  const { value, setValue, submit, placeholder, setInputAreaHeight } = useInputContext();
  const containerRef = useRef<DOMElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const { height } = measureElement(containerRef.current);
    setInputAreaHeight(height);
  }, [setInputAreaHeight, placeholder]);

  return (
    <Box ref={containerRef} flexDirection="column">
      <Box borderStyle="round" minHeight={3} width="100%">
        <Text>Input: </Text>
        <TextInput value={value} placeholder={placeholder} onChange={setValue} onSubmit={submit} />
      </Box>
      <Box height={1}>
        <Text dimColor>ESC: Home | /exit: Quit | /home: Home</Text>
      </Box>
    </Box>
  );
};
