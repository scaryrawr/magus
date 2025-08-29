import { ScrollArea } from "@magus/react";
import { type MagusClient, type ModelSelect } from "@magus/server";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useInputContext, useServerContext } from "../contexts";

type ModelsData = {
  models: ModelSelect[];
};

// Create a fuzzy regex pattern by escaping special characters and inserting .* between each character
const createFuzzyRegex = (input: string): RegExp => {
  if (!input.trim()) {
    return /.*/; // Match everything if input is empty
  }

  // Escape special regex characters
  const escaped = input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Split into characters and join with .* to allow any characters in between
  const pattern = escaped.split("").join(".*");

  // Create case-insensitive regex
  return new RegExp(pattern, "i");
};

export const Models = () => {
  const { models } = useLoaderData<ModelsData>();
  const { value, setValue, contentHeight } = useInputContext();
  const navigate = useNavigate();
  const { server } = useServerContext();

  const items = useMemo(() => {
    const fuzzyRegex = createFuzzyRegex(value);
    return models
      .map((model) => {
        const label = `${model.provider}: ${model.id}`;
        return {
          label,
          key: label,
          value: model,
        };
      })
      .filter(({ label }) => fuzzyRegex.test(label));
  }, [models, value]);

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
    <ScrollArea width="100%" height={contentHeight}>
      <SelectInput items={items} onSelect={onSelection} />
    </ScrollArea>
  );
};

export const createModelRoute = (client: MagusClient) => {
  return {
    path: "models",
    loader: async () => {
      const res = await client.v0.models.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
      }

      const models = await res.json();
      return { models };
    },
    Component: Models,
  };
};
