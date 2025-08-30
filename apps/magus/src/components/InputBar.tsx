import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useInputContext, useRoutes } from "../contexts";

export const InputBar: React.FC = () => {
  const { value, setValue, submit, placeholder } = useInputContext();
  const { routes } = useRoutes();
  const navigate = useNavigate();

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
    <Box borderStyle="round" minHeight={3} width="100%">
      <Text>Input: </Text>
      <TextInput value={value} placeholder={placeholder} onChange={setValue} onSubmit={onSubmit} />
    </Box>
  );
};
