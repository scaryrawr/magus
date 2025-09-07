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

const getDiffViewerCmd = (() => {
  const getCmd = () => getDeltaCmd() || getBatCmd();
  let cache: ReturnType<typeof getCmd> | undefined;
  return () => {
    if (cache === undefined) {
      cache = getCmd();
    }

    return cache;
  };
})();

export const DiffViewer: React.FC<DiffViewerProps> = ({ children, path, commandOverride }) => {
  const diffCmd = commandOverride?.command ?? getDiffViewerCmd();
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

  return children.split("\n").map((line, i) => {
    switch (line[0]) {
      case "@":
        return (
          <Text color="blue" key={i}>
            {line}
          </Text>
        );
      case "+":
        return (
          <Text color="green" key={i}>
            {line}
          </Text>
        );
      case "-":
        return (
          <Text color="red" key={i}>
            {line}
          </Text>
        );
      default:
        return <Text key={i}>{line}</Text>;
    }
  });
};
