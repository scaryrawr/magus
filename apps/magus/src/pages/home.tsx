import { useCallback } from "react";
import { useNavigate } from "react-router";
import { Banner } from "../components/Banner";
import { useServerContext } from "../contexts/ServerProvider";
import { useStackedRouteInput } from "../contexts/inputStore";

export const Home = () => {
  const navigate = useNavigate();
  const { client } = useServerContext();

  const onSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      const res = await client.v0.chat.new.$post();
      if (!res.ok) {
        console.error("Failed to create new chat:", await res.text());
        return;
      }

      const { chatId } = await res.json();
      void navigate(`/chat/${chatId}`, {
        state: { text },
      });
    },
    [client, navigate],
  );

  useStackedRouteInput({ onSubmit, placeholder: "Send a message..." });

  return <Banner />;
};
