import { useInput } from "ink";
import { useRawStdin } from "./useRawStdin.js";

export const useKeypress = (...props: Parameters<typeof useInput>) => {
  useRawStdin();
  return useInput(...props);
};
