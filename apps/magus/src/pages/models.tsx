import { type ModelSelect } from "@magus/server";
import { ModelsResultSchema } from "@magus/server/src/models";
import { Box } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useInputContext, useServerContext } from "../contexts";

type ModelsData = {
  models: ModelSelect[];
};

export const Models = () => {
  const { models } = useLoaderData<ModelsData>();
  const { value, setValue } = useInputContext();
  const navigate = useNavigate();
  const { server } = useServerContext();

  const items = useMemo(
    () =>
      models
        .filter((model) => model.id.includes(value) || model.provider.includes(value))
        .map((model) => {
          const label = `${model.provider}: ${model.id}`;
          return {
            label,
            key: label,
            value: model,
          };
        }),
    [models, value],
  );

  const onSelection = useCallback(
    async ({ value: model }: { label: string; value: ModelSelect }) => {
      const modelUrl = new URL("/v0/model", server.url);
      try {
        await fetch(modelUrl, {
          body: JSON.stringify(model),
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.error("Failed to switch models:", e);
      }

      navigate(-1);
      setValue("");
    },
    [navigate, server.url, setValue],
  );

  return (
    <Box flexDirection="column">
      <SelectInput items={items} onSelect={onSelection} />
    </Box>
  );
};

export const createModelRoute = (serverUrl: URL) => {
  return {
    path: "models",
    loader: async () => {
      const modelsUrl = new URL("v0/models", serverUrl);
      const res = await fetch(modelsUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
      }

      const models: ModelSelect[] = ModelsResultSchema.parse(await res.json());
      return { models };
    },
    Component: Models,
  };
};
