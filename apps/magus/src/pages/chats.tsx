import type { MagusClient } from "@magus/server";
import Fuse from "fuse.js";
import SelectInput from "ink-select-input";
import { useCallback, useMemo } from "react";
import { useLoaderData, useNavigate, type RouteObject } from "react-router";
import { useInputValue, useSetInputValue, useStackedRouteInput } from "../contexts/inputStore";

type ChatSummary = { id: string; title?: string };

export const Chats = () => {
  const chats = useLoaderData<ChatSummary[]>();
  const value = useInputValue();
  const setValue = useSetInputValue();
  const navigate = useNavigate();
  const fuse = useMemo(
    () =>
      new Fuse(chats, {
        keys: ["id", "title"],
      }),
    [chats],
  );

  const items = useMemo(() => {
    const mapChats = (chat: ChatSummary) => {
      const label = chat.title ? `${chat.title}` : chat.id;
      return {
        label,
        key: chat.id,
        value: chat,
      };
    };
    if (!value) {
      return chats.map(mapChats);
    }
    return fuse.search(value).map(({ item: chat }) => mapChats(chat));
  }, [chats, fuse, value]);

  const onSelection = useCallback(
    ({ value: chat }: { label: string; value: ChatSummary }) => {
      // navigate may return a promise; intentionally ignore
      void navigate(`/chat/${chat.id}`);
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

  return <SelectInput items={items} limit={5} onSelect={onSelection} />;
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
