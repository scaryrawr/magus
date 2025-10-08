import { type ModelSelect } from "@magus/server";
import Fuse from "fuse.js";
import { useStderr } from "ink";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useNavigate, type RouteObject } from "react-router";
import { useInputValue, useSetInputValue, useStackedRouteInput } from "../contexts/inputStore";
import { useModel, useModels } from "../contexts/ModelContext";

export const Models = () => {
  const { models } = useModels();
  const value = useInputValue();
  const setValue = useSetInputValue();
  const navigate = useNavigate();
  const { selectModel } = useModel();
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
        await selectModel(model);
      } catch (e) {
        // Coerce error to string explicitly for eslint @typescript-eslint/restrict-template-expressions
        const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        stderr.write(`Failed to switch models: ${message}\n`);
      }

      // ignore promise result if any
      void navigate(-1);
      setValue("");
    },
    [selectModel, navigate, setValue, stderr],
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

export const createModelRoute = () => {
  return {
    path: "models",
    Component: Models,
  } as const satisfies RouteObject;
};
