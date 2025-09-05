import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useInputPlaceholder, useInputSubmit, useInputValue, useRoutes, useSetInputValue } from "../contexts";

export const InputBar: React.FC = () => {
  const value = useInputValue();
  const setValue = useSetInputValue();
  const submit = useInputSubmit();
  const placeholder = useInputPlaceholder();
  const { routes } = useRoutes();
  const navigate = useNavigate();

  const onSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      const foundRoute = routes.find((route) => route.path.trim() === value.trim());
      if (foundRoute) {
        setValue("");
        // navigate from react-router returns void | Promise (ignore intentionally)
        void navigate(foundRoute.path);
        return;
      }

      await submit(value);
    },
    [navigate, routes, setValue, submit, value],
  );

  return (
    <Box borderStyle="round" minHeight={3} width="100%">
      <Text>Input: </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChange={setValue}
        // Avoid passing a promise-returning callback directly. Wrap to explicitly ignore promise.
        onSubmit={(text) => {
          void onSubmit(text);
        }}
      />
    </Box>
  );
};
