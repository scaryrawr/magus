import { type MagusClient, type ModelSelect } from "@magus/server";
import Fuse from "fuse.js";
import { useStderr } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate, type RouteObject } from "react-router";
import { useInputValue, useServerContext, useSetInputValue, useStackedRouteInput } from "../contexts";

export const Models = () => {
  const models = useLoaderData<ModelSelect[]>();
  const value = useInputValue();
  const setValue = useSetInputValue();
  const navigate = useNavigate();
  const { client } = useServerContext();
  const stderr = useStderr();
  const fuse = useMemo(
    () =>
      new Fuse(models, {
        keys: ["id", "provider"],
      }),
    [models],
  );

  const items = useMemo(() => {
    const mapModels = (model: ModelSelect) => {
      const label = `${model.provider}: ${model.id}`;
      return {
        label,
        key: label,
        value: model,
      };
    };
    if (!value) {
      return models.map(mapModels);
    }
    return fuse.search(value).map(({ item: model }) => mapModels(model));
  }, [fuse, models, value]);

  const onSelection = useCallback(
    async ({ value: model }: { label: string; value: ModelSelect }) => {
      try {
        await client.v0.model.$put({ json: model });
      } catch (e) {
        // Coerce error to string explicitly for eslint @typescript-eslint/restrict-template-expressions
        const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        stderr.write(`Failed to switch models: ${message}\n`);
      }

      // ignore promise result if any
      void navigate(-1);
      setValue("");
    },
    [client.v0.model, navigate, setValue, stderr],
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
