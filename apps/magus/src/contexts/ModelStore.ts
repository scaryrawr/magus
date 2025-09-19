import { ModelInfoSchema, type ModelInfo } from "@magus/providers";
import { type ModelSelect } from "@magus/server";
import { useCallback, useEffect, useState } from "react";
import { subscribeToSse } from "../utils/sseManager";
import { useServerContext } from "./ServerProvider";

export const useModelInfo = () => {
  const { server } = useServerContext();
  const [modelInfo, setModelInfo] = useState<ModelInfo>({ id: "unknown", provider: "unknown" });

  const updateModelInfo = useCallback((data: ModelSelect) => {
    setModelInfo((previous) => {
      if (data.id === previous.id && data.provider === previous.provider) {
        return previous;
      }

      return data;
    });
  }, []);

  useEffect(() => {
    const url = new URL("v0/model/sse", server.url).href;

    const handleModelChange = (event: MessageEvent<string>) => {
      try {
        if (!event.data) return;
        const parsed: unknown = JSON.parse(event.data);
        const result = ModelInfoSchema.safeParse(parsed);
        if (result.success) {
          updateModelInfo(result.data);
        }
      } catch {
        // swallow parse errors; SSE stream may contain keep-alives in future
      }
    };

    const unsubscribe = subscribeToSse(url, "model-change", handleModelChange);

    return () => {
      unsubscribe();
    };
  }, [server.url, updateModelInfo]);

  return modelInfo;
};
