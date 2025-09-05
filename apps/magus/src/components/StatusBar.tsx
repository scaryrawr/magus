import type { ModelSelect } from "@magus/server";
import { ModelSelectSchema } from "@magus/server";
import { EventSource } from "eventsource";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import { useChatContext, useServerContext } from "../contexts";

const useModelInfo = () => {
  const { server, client } = useServerContext();
  const [modelInfo, setModelInfo] = useState<ModelSelect>({ id: "unknown", provider: "unknown" });
  useEffect(() => {
    let disposed = false;
    client.v0.model.$get().then(async (res) => {
      const data = await res.json();
      if (disposed) return;

      setModelInfo(data);
    });

    return () => {
      disposed = true;
    };
  }, [client]);

  useEffect(() => {
    const eventSource = new EventSource(new URL("v0/sse", server.url).href);

    const handleModelChange = (event: MessageEvent<string>) => {
      try {
        if (!event.data) return;
        const parsed: unknown = JSON.parse(event.data);
        const result = ModelSelectSchema.safeParse(parsed);
        if (result.success) {
          setModelInfo(result.data);
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
  }, [server.url]);

  return modelInfo;
};

export const StatusBar: React.FC = () => {
  const { chatStatus } = useChatContext();
  const modelInfo = useModelInfo();

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>
        {modelInfo.provider}/{modelInfo.id}
      </Text>
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
