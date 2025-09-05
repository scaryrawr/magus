import { type MagusClient, type ModelSelect } from "@magus/server";
import { useStderr } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate, type RouteObject } from "react-router";
import { useInputValue, useServerContext, useSetInputValue, useStackedRouteInput } from "../contexts";

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
  const models = useLoaderData<ModelSelect[]>();
  const value = useInputValue();
  const setValue = useSetInputValue();
  const navigate = useNavigate();
  const { server } = useServerContext();
  const stderr = useStderr();

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
        // Coerce error to string explicitly for eslint @typescript-eslint/restrict-template-expressions
        const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        stderr.write(`Failed to switch models: ${message}\n`);
      }

      // ignore promise result if any
      void navigate(-1);
      setValue("");
    },
    [navigate, server.url, setValue, stderr],
  );

  useStackedRouteInput({
    intercept: true,
    clearOnSubmit: false,
    placeholder: "Filter models...",
    onSubmit: () => {
      // no-op intercept to prevent InputBar submit fallback; selection handled via onSelect list UI
    },
  });

  return (
    <SelectInput
      items={items}
      limit={5}
      onSelect={(item) => {
        void onSelection(item);
      }}
    />
  );
};

export const createModelRoute = (client: MagusClient) => {
  return {
    path: "models",
    loader: async (): Promise<ModelSelect[]> => {
      const res = await client.v0.models.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
      }

      const models = await res.json();
      return models;
    },
    Component: Models,
  } as const satisfies RouteObject;
};
