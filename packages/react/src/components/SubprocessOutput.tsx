import { Text } from "ink";
import React from "react";

type SubprocessOutputProps = {
  command: string;
  args?: string[];
  children: string | undefined;
};

export const SubprocessOutput: React.FC<SubprocessOutputProps> = ({ command, args = [], children: stdin }) => {
  const [output, setOutput] = React.useState("");

  React.useEffect(() => {
    const stdinBuffer = stdin ? new TextEncoder().encode(stdin) : undefined;
    const subProcess = Bun.spawn([command, ...args], {
      stdin: stdinBuffer,
      stdout: "pipe",
      stderr: "pipe",
    });

    let disposed = false;
    subProcess.stdout.text().then((text) => {
      if (disposed) return;
      setOutput(text);
    });

    return () => {
      disposed = true;
    };
  }, [args, command, setOutput, stdin]);

  return <Text>{output}</Text>;
};
