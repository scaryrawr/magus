import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type RouteInputHandler = (text: string) => void | Promise<void>;

interface InputContextValue {
  // UI state
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;

  // Submission
  submit: () => void;

  // Route integration
  setRouteInput: (opts: { handler: RouteInputHandler; clearOnSubmit?: boolean; placeholder?: string }) => void;
  clearRouteInput: () => void;
}

const InputContext = createContext<InputContextValue | null>(null);

interface InputProviderProps {
  children: React.ReactNode;
}

interface HandlerState {
  handler?: RouteInputHandler;
  clearOnSubmit: boolean;
  placeholder?: string;
}

export const InputProvider: React.FC<InputProviderProps> = ({ children }) => {
  const [value, setValue] = useState("");
  const handlerRef = useRef<HandlerState>({ clearOnSubmit: true });
  const [placeholder, setPlaceholder] = useState<string | undefined>();

  const submit = useCallback(() => {
    const text = value;
    if (!handlerRef.current.handler) return;

    Promise.resolve(handlerRef.current.handler(text)).finally(() => {
      if (handlerRef.current.clearOnSubmit) setValue("");
    });
  }, [value]);

  const setRouteInput = useCallback(
    (opts: { handler: RouteInputHandler; clearOnSubmit?: boolean; placeholder?: string }) => {
      handlerRef.current = {
        handler: opts.handler,
        clearOnSubmit: opts.clearOnSubmit ?? true,
        placeholder: opts.placeholder,
      };
      setPlaceholder(opts.placeholder);
    },
    [],
  );

  const clearRouteInput = useCallback(() => {
    handlerRef.current = { handler: undefined, clearOnSubmit: true, placeholder: undefined };
    setPlaceholder(undefined);
    setValue("");
  }, []);

  // Expose memoized context
  const ctx = useMemo<InputContextValue>(
    () => ({
      value,
      setValue,
      placeholder,
      submit,
      setRouteInput,
      clearRouteInput,
    }),
    [value, placeholder, submit, setRouteInput, clearRouteInput],
  );

  return <InputContext.Provider value={ctx}>{children}</InputContext.Provider>;
};

export const useInputContext = (): InputContextValue => {
  const ctx = useContext(InputContext);
  if (!ctx) throw new Error("useInputContext must be used within an InputProvider");
  return ctx;
};

interface UseRouteInputOptions {
  onSubmit: RouteInputHandler;
  placeholder?: string;
  clearOnSubmit?: boolean;
}

// Hook for a route to register its input handling behavior.
export const useRouteInput = ({ onSubmit, placeholder, clearOnSubmit = true }: UseRouteInputOptions) => {
  const { setValue, setRouteInput, clearRouteInput } = useInputContext();
  useEffect(() => {
    setRouteInput({ handler: onSubmit, clearOnSubmit, placeholder });
    return () => {
      clearRouteInput();
    };
  }, [onSubmit, placeholder, clearOnSubmit, setRouteInput, clearRouteInput]);

  return { setValue } as const;
};
