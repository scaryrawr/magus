import { useEffect } from "react";
import { useStdin } from "ink";

/**
 * Only use once at the top of your app, a workaround for Bun for getting raw input in Ink
 */
export const useRawStdin = () => {
  const { isRawModeSupported, setRawMode } = useStdin();
  useEffect(() => {
    if (isRawModeSupported) {
      setRawMode(true);
    }

    return () => {
      setRawMode(false);
    };
  });
};
