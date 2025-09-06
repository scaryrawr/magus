import type { ModelSelect } from "@magus/server";
import { ModelSelectSchema } from "@magus/server";
import { EventSource } from "eventsource";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useEffect, useState } from "react";
import { useChatContext, useServerContext } from "../contexts";

const useModelInfo = () => {
  const { server, client } = useServerContext();
  const [modelInfo, setModelInfo] = useState<ModelSelect>({ id: "unknown", provider: "unknown" });

  const updateModelInfo = useCallback((data: ModelSelect) => {
    setModelInfo((previous) => {
      if (data.id === previous.id && data.provider === previous.provider) {
        return previous;
      }

      return data;
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    client.v0.model
      .$get()
      .then(async (res) => {
        const data = await res.json();
        if (disposed) return;
        updateModelInfo(data);
      })
      .catch(() => {
        // ignore fetch errors
      });

    return () => {
      disposed = true;
    };
  }, [client, updateModelInfo]);

  useEffect(() => {
    const eventSource = new EventSource(new URL("v0/sse", server.url).href);

    const handleModelChange = (event: MessageEvent<string>) => {
      try {
        if (!event.data) return;
        const parsed: unknown = JSON.parse(event.data);
        const result = ModelSelectSchema.safeParse(parsed);
        if (result.success) {
          updateModelInfo(result.data);
        }
      } catch {
        // swallow parse errors; SSE stream may contain keep-alives in future
      }
    };

    eventSource.addEventListener("model-change", handleModelChange);

    return () => {
      eventSource.removeEventListener("model-change", handleModelChange);
      eventSource.close();
    };
  }, [server.url, updateModelInfo]);

  return modelInfo;
};

export const StatusBar: React.FC = () => {
  const { chatStatus } = useChatContext();
  const { server } = useServerContext();
  const modelInfo = useModelInfo();
  const url = server.url.href;

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>
        {modelInfo.provider}/{modelInfo.id}
      </Text>
      <Text dimColor>Server: {url}</Text>
      <Text dimColor>
        {chatStatus === "streaming" || chatStatus === "submitted" ? (
          <Text color={chatStatus === "streaming" ? "green" : "yellow"}>
            <Spinner type="dots" />
          </Text>
        ) : null}
        {chatStatus}
      </Text>
    </Box>
  );
};
