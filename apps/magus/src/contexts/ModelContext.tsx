import { ModelInfoSchema, type ModelInfo } from "@magus/providers";
import { type ModelSelect } from "@magus/server";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { subscribeToSse } from "../utils/sseManager";
import { useServerContext } from "./ServerProvider";

// State types
export interface ModelState {
  models: ModelSelect[];
  currentModel: ModelInfo | null;
  loading: boolean;
  error: string | null;
}

// Action types
export type ModelAction =
  | { type: "LOAD_MODELS_START" }
  | { type: "LOAD_MODELS_SUCCESS"; payload: ModelSelect[] }
  | { type: "LOAD_MODELS_ERROR"; payload: string }
  | { type: "SELECT_MODEL_START" }
  | { type: "SELECT_MODEL_SUCCESS"; payload: ModelInfo }
  | { type: "SELECT_MODEL_ERROR"; payload: string }
  | { type: "UPDATE_CURRENT_MODEL"; payload: ModelInfo }
  | { type: "CLEAR_ERROR" };

// Initial state
const initialState: ModelState = {
  models: [],
  currentModel: null,
  loading: false,
  error: null,
};

// Reducer
function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case "LOAD_MODELS_START":
      return { ...state, loading: true, error: null };
    case "LOAD_MODELS_SUCCESS":
      return { ...state, loading: false, models: action.payload, error: null };
    case "LOAD_MODELS_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SELECT_MODEL_START":
      return { ...state, loading: true, error: null };
    case "SELECT_MODEL_SUCCESS":
      return { ...state, loading: false, currentModel: action.payload, error: null };
    case "SELECT_MODEL_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_CURRENT_MODEL":
      return { ...state, currentModel: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// Context types
export interface ModelContextValue {
  // State
  models: ModelSelect[];
  currentModel: ModelInfo | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshModels: () => Promise<void>;
  selectModel: (model: ModelSelect) => Promise<void>;
  clearError: () => void;

  // Computed values
  capabilities: {
    reasoning: boolean;
    toolUse: boolean;
    contextLength: number | null;
  };
}

const ModelContext = createContext<ModelContextValue | null>(null);

// Provider props
export interface ModelProviderProps {
  children: ReactNode;
}

// Provider component
export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  const { client, server } = useServerContext();
  const [state, dispatch] = useReducer(modelReducer, initialState);

  // Load models from server
  const refreshModels = useCallback(async () => {
    dispatch({ type: "LOAD_MODELS_START" });
    try {
      const res = await client.v0.models.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
      }
      const models = await res.json();
      dispatch({ type: "LOAD_MODELS_SUCCESS", payload: models });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({ type: "LOAD_MODELS_ERROR", payload: message });
    }
  }, [client]);

  // Select a model
  const selectModel = useCallback(
    async (model: ModelSelect) => {
      dispatch({ type: "SELECT_MODEL_START" });
      try {
        const res = await client.v0.model.$put({ json: model });
        if (!res.ok) {
          throw new Error(`Failed to select model: ${res.status} ${res.statusText}`);
        }

        // Fetch the full model info after successful selection
        const modelRes = await client.v0.model[":provider"][":id"].$get({
          param: { provider: model.provider, id: model.id },
        });

        if (modelRes.ok) {
          const modelInfo = await modelRes.json();
          dispatch({ type: "SELECT_MODEL_SUCCESS", payload: modelInfo });
        } else {
          // Fallback to basic info if detailed fetch fails
          const basicModelInfo: ModelInfo = {
            id: model.id,
            provider: model.provider,
          };
          dispatch({ type: "SELECT_MODEL_SUCCESS", payload: basicModelInfo });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: "SELECT_MODEL_ERROR", payload: message });
      }
    },
    [client],
  );

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Computed capabilities
  const capabilities = useMemo(
    () => ({
      reasoning: state.currentModel?.reasoning ?? false,
      toolUse: state.currentModel?.tool_use ?? false,
      contextLength: state.currentModel?.context_length ?? null,
    }),
    [state.currentModel],
  );

  // SSE subscription for model changes
  useEffect(() => {
    const url = new URL("v0/model/sse", server.url).href;

    const handleModelChange = (event: MessageEvent<string>) => {
      try {
        if (!event.data) return;
        const parsed: unknown = JSON.parse(event.data);
        const result = ModelInfoSchema.safeParse(parsed);
        if (result.success) {
          dispatch({ type: "UPDATE_CURRENT_MODEL", payload: result.data });
        }
      } catch {
        // swallow parse errors; SSE stream may contain keep-alives in future
      }
    };

    const unsubscribe = subscribeToSse(url, "model-change", handleModelChange);

    return () => {
      unsubscribe();
    };
  }, [server.url]);

  // Load models on mount
  useEffect(() => {
    void refreshModels();
  }, [refreshModels]);

  // Context value
  const value: ModelContextValue = useMemo(
    () => ({
      models: state.models,
      currentModel: state.currentModel,
      loading: state.loading,
      error: state.error,
      refreshModels,
      selectModel,
      clearError,
      capabilities,
    }),
    [state, refreshModels, selectModel, clearError, capabilities],
  );

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};

// Hooks
export const useModelContext = (): ModelContextValue => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModelContext must be used within a ModelProvider");
  }
  return context;
};

export const useModel = () => {
  const context = useModelContext();
  return {
    currentModel: context.currentModel,
    selectModel: context.selectModel,
    loading: context.loading,
    error: context.error,
    capabilities: context.capabilities,
    clearError: context.clearError,
  };
};

export const useModels = () => {
  const context = useModelContext();
  return {
    models: context.models,
    refreshModels: context.refreshModels,
    loading: context.loading,
    error: context.error,
    clearError: context.clearError,
  };
};
