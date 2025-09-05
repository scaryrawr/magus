import type { MagusClient } from "@magus/server";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate, type RouteObject } from "react-router";
import { useInputValue, useSetInputValue, useStackedRouteInput } from "../contexts";

type ChatSummary = { id: string; title?: string };

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

export const Chats = () => {
  const chats = useLoaderData<ChatSummary[]>();
  const value = useInputValue();
  const setValue = useSetInputValue();
  const navigate = useNavigate();

  const items = useMemo(() => {
    const fuzzyRegex = createFuzzyRegex(value);
    return chats
      .map((chat) => {
        const label = chat.title ? `${chat.title} (${chat.id})` : chat.id;
        return {
          label,
          key: chat.id,
          value: chat,
        };
      })
      .filter(({ label }) => fuzzyRegex.test(label));
  }, [chats, value]);

  const onSelection = useCallback(
    ({ value: chat }: { label: string; value: ChatSummary }) => {
      navigate(`/chat/${chat.id}`);
      setValue("");
    },
    [navigate, setValue],
  );

  // Allow pressing enter in InputBar to open first filtered chat
  useStackedRouteInput({
    intercept: true,
    clearOnSubmit: false,
    placeholder: "Filter chats...",
    onSubmit: () => {
      // no-op: intercept only so InputBar submit does not fall back to chat creation
    },
  });

  return <SelectInput items={items} onSelect={onSelection} />;
};

export const createChatsRoute = (client: MagusClient) => {
  return {
    path: "chats",
    loader: async (): Promise<ChatSummary[]> => {
      const res = await client.v0.chats.$get();
      if (!res.ok) {
        throw new Error(`Failed to fetch chats: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return data;
    },
    Component: Chats,
  } as const satisfies RouteObject;
};
