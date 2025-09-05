import React from "react";
import { create } from "zustand";

/**
 * InputSubmitHandler
 *
 * Receives the submitted text and an API:
 *  - inject(text): append text to the current input without submitting (for pickers, @mentions, etc.)
 *  - done(): mark this handler as completed and (optionally) clear the input if clearOnSubmit was set
 *
 * If a handler wants to intercept (e.g. a file picker), it should push itself with intercept: true.
 * In the current implementation intercept is advisory; cascade logic could be added later.
 */
export type InputSubmitHandler = (
  text: string,
  api: { inject: (text: string) => void; done: () => void },
) => void | Promise<void>;

interface HandlerEntry {
  handler: InputSubmitHandler;
  placeholder?: string;
  clearOnSubmit: boolean;
  // If true, submission doesn't fall through to next stack (used for temporary pickers)
  intercept?: boolean;
}

/**
 * InputState (zustand)
 *
 * We maintain a stack of handlers so temporary contextual UIs (like a file picker)
 * can override the base chat submit handler. When the temporary UI finishes (calls api.done()
 * or unmounts) we pop and restore the previous handler + placeholder.
 */
interface InputState {
  value: string;
  handlers: HandlerEntry[]; // stack, top = active
  submitting: boolean;
  setValue: (v: string) => void;
  pushHandler: (entry: Omit<HandlerEntry, "clearOnSubmit"> & { clearOnSubmit?: boolean }) => void;
  // Remove a specific handler instance (by function identity)
  popHandler: (handler: InputSubmitHandler) => void;
  clearAllHandlers: () => void;
  submit: (textOverride?: string) => Promise<boolean>; // returns true if something handled
  placeholder?: string;
}

export const useInputStore = create<InputState>((set, get) => ({
  value: "",
  handlers: [],
  submitting: false,
  placeholder: undefined,
  setValue: (v) => set({ value: v }),
  pushHandler: ({ handler, placeholder, intercept, clearOnSubmit }) =>
    set((s) => ({
      handlers: [...s.handlers, { handler, placeholder, intercept, clearOnSubmit: clearOnSubmit ?? true }],
      // If a placeholder is provided, override; otherwise retain current (top-most wins semantics)
      placeholder: placeholder ?? s.placeholder,
    })),
  popHandler: (handlerToRemove) =>
    set((s) => {
      const index = s.handlers.findIndex((h) => h.handler === handlerToRemove);
      if (index === -1) return s; // nothing to do
      const handlers = [...s.handlers.slice(0, index), ...s.handlers.slice(index + 1)];
      const top = handlers[handlers.length - 1];
      return { handlers, placeholder: top?.placeholder };
    }),
  clearAllHandlers: () => set({ handlers: [], placeholder: undefined }),
  submit: async (textOverride) => {
    const { handlers, value } = get();
    if (!handlers.length) return false;
    const active = handlers[handlers.length - 1];
    const text = (textOverride ?? value).trim();
    if (!text) return false;
    let removed = false;
    const api = {
      inject: (extra: string) => {
        // inject text into input without submitting
        const current = get().value;
        set({ value: current + extra });
      },
      done: () => {
        removed = true;
        if (active.clearOnSubmit) set({ value: "" });
      },
    } as const;
    try {
      await Promise.resolve(active.handler(text, api));
    } finally {
      if (removed) {
        // Remove only the specific handler instance that called done()
        set((s) => {
          const idx = s.handlers.findIndex((h) => h.handler === active.handler);
          if (idx === -1) return s; // already removed (e.g., unmounted)
          const newHandlers = [...s.handlers.slice(0, idx), ...s.handlers.slice(idx + 1)];
          const top = newHandlers[newHandlers.length - 1];
          return { handlers: newHandlers, placeholder: top?.placeholder };
        });
      } else if (active.clearOnSubmit) {
        set({ value: "" });
      }

      // If intercept is false and there is another previous handler, optionally we can cascade.
      // For now we stop at top-most. Cascade could be added here by iterating backwards.
    }
    return true;
  },
}));

// Selectors / hooks
export const useInputValue = () => useInputStore((s) => s.value);
export const useInputPlaceholder = () => useInputStore((s) => s.placeholder);
export const useInputSubmit = () => useInputStore((s) => s.submit);
export const usePushHandler = () => useInputStore((s) => s.pushHandler);
export const usePopHandler = () => useInputStore((s) => s.popHandler);
export const useSetInputValue = () => useInputStore((s) => s.setValue);

export interface UseStackedRouteInputOptions {
  onSubmit: InputSubmitHandler;
  placeholder?: string;
  clearOnSubmit?: boolean;
  intercept?: boolean;
}

export const useStackedRouteInput = ({
  onSubmit,
  placeholder,
  clearOnSubmit = true,
  intercept,
}: UseStackedRouteInputOptions) => {
  const push = usePushHandler();
  const pop = usePopHandler();
  // naive effect - if onSubmit identity changes often, user should memo it.
  React.useEffect(() => {
    push({ handler: onSubmit, placeholder, clearOnSubmit, intercept });
    return () => pop(onSubmit);
  }, [onSubmit, placeholder, clearOnSubmit, intercept, push, pop]);
};
