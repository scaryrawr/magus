import { useApp } from "ink";
import { useEffect } from "react";

export const Exit = () => {
  const { exit } = useApp();
  useEffect(() => {
    exit();
  }, [exit]);
  return <></>;
};
