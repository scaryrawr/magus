import { Box, Text, measureElement, type DOMElement } from "ink";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useRoutes } from "../contexts";
import { useInputContext } from "../contexts/InputProvider";

export const InputBar: React.FC = () => {
  const { value, setValue, submit, placeholder, setInputAreaHeight } = useInputContext();
  const { routes } = useRoutes();
  const containerRef = useRef<DOMElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    const { height } = measureElement(containerRef.current);
    setInputAreaHeight(height);
  }, [setInputAreaHeight, placeholder]);

  const onSubmit = useCallback(
    (value: string) => {
      if (routes.includes(value)) {
        setValue("");
        navigate(value);
        return;
      }

      submit();
    },
    [navigate, routes, setValue, submit],
  );

  return (
    <Box ref={containerRef}>
      <Box borderStyle="round" minHeight={3} width="100%">
        <Text>Input: </Text>
        <TextInput value={value} placeholder={placeholder} onChange={setValue} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
};
