import { useMemo } from "react";
import { SubprocessOutput } from "./SubprocessOutput";

type DeltaProps = {
  children: string;
  path: string;
  language?: string;
  emulate?: "diff-highlight" | "diff-so-fancy";
  view?: "side-by-side" | "unified";
};

export const Delta: React.FC<DeltaProps> = ({ children, path, language, emulate, view }) => {
  const args = useMemo(() => {
    const arr = ["--color-only"];
    if (language) {
      arr.push("--default-language", language);
    } else if (path) {
      const ext = path.split(".").pop();
      if (ext) {
        arr.push("--default-language", ext);
      }
    }

    if (emulate) {
      arr.push(`==${emulate}`);
    }

    if (view === "side-by-side") {
      arr.push("--side-by-side");
    }

    return arr;
  }, [emulate, language, path, view]);
  return (
    <SubprocessOutput command="delta" args={args}>
      {children}
    </SubprocessOutput>
  );
};
