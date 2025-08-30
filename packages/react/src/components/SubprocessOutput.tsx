import { Text } from "ink";
import React from "react";
import stripAnsi from "strip-ansi";
type SubprocessOutputProps = {
  command: string;
  args?: string[];
  children: string | undefined;
};

export const SubprocessOutput: React.FC<SubprocessOutputProps> = ({ command, args = [], children: stdin }) => {
  const [output, setOutput] = React.useState("");

  React.useEffect(() => {
    const stdinBuffer = stdin ? new TextEncoder().encode(stdin) : undefined;
    const subProcess = Bun.spawnSync([command, ...args], {
      stdin: stdinBuffer,
    });

    setOutput(stripAnsi(subProcess.stdout.toString()));
  }, [args, command, setOutput, stdin]);

  return <Text>{output}</Text>;
};
