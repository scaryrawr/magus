import { highlight } from "cli-highlight";
import { Text } from "ink";
import { Bat, Delta, SubprocessOutput } from ".";

type DiffViewerProps = {
  path: string;
  children: string;
  commandOverride?: {
    command: string;
    args?: string[];
  };
};

const getDeltaCmd = () => {
  if (Bun.which("delta")) return "delta";
  return null;
};

const getBatCmd = () => {
  if (Bun.which("bat")) return "bat";
  return null;
};

export const getDiffViewerCmd = (() => {
  const getCmd = () => getBatCmd() ?? getDeltaCmd();
  let cache: ReturnType<typeof getCmd> | undefined;
  return () => {
    if (cache === undefined) {
      cache = getCmd();
    }

    return cache;
  };
})();

export const DiffViewer: React.FC<DiffViewerProps> = ({ children, path, commandOverride }) => {
  const diffCmd = commandOverride?.command; // ?? getDiffViewerCmd();
  switch (diffCmd) {
    case "delta":
      return <Delta path={path}>{children}</Delta>;
    case "bat":
      return <Bat path={path}>{children}</Bat>;
  }

  if (diffCmd) {
    return (
      <SubprocessOutput command={diffCmd} args={commandOverride?.args}>
        {children}
      </SubprocessOutput>
    );
  }

  const language = path.split(".").pop() ?? "diff";

  const highlighted = highlight(children, { language, ignoreIllegals: true });
  const lines = highlighted.split("\n");
  return lines.map((line, index) => {
    switch (line[0]) {
      case "+":
        return (
          <Text key={index} backgroundColor="#0B2401">
            {line}
          </Text>
        );
      case "-":
        return (
          <Text key={index} backgroundColor="#3E0405">
            {line}
          </Text>
        );
      default:
        return <Text key={index}>{line}</Text>;
    }
  });
};
