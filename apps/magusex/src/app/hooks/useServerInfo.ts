import { useEffect, useState } from "react";

export function useServerInfo() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // Ensure we're in a browser/electron renderer context
        if (typeof window === "undefined") return;
        const api = window.electronAPI;
        if (!api || typeof api.getServerInfo !== "function") {
          throw new Error("electronAPI.getServerInfo not available");
        }
        const info = await api.getServerInfo();
        if (!cancelled) setUrl(info.url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { url, error } as const;
}
