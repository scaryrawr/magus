import { useInput } from "ink";

export const useKeypress = (...props: Parameters<typeof useInput>) => {
  return useInput(...props);
};
