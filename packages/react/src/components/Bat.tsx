import { useMemo } from "react";
import { SubprocessOutput } from "./SubprocessOutput";

type BatProps = {
  children: string;
  path: string;
  language?: string;
};

export const Bat: React.FC<BatProps> = ({ children, path, language }) => {
  const args = useMemo(() => {
    const arr: string[] = ["--force-colorization"];
    if (language) {
      arr.push("--language", language);
    }

    arr.push("--file-name", path);

    return arr;
  }, [language, path]);
  return (
    <SubprocessOutput command="bat" args={args}>
      {children}
    </SubprocessOutput>
  );
};
