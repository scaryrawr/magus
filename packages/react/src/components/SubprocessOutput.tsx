import { Text } from "ink";
import React from "react";
import { parseAnsiToSegments } from "../utils/ansi";
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

    setOutput(subProcess.stdout.toString());
  }, [args, command, setOutput, stdin]);

  const segments = React.useMemo(() => parseAnsiToSegments(output), [output]);

  return (
    <Text>
      {segments.map((seg, i) => (
        <Text
          key={i}
          color={seg.color}
          backgroundColor={seg.backgroundColor}
          bold={seg.bold}
          underline={seg.underline}
          italic={seg.italic}
          strikethrough={seg.strikethrough}
          dimColor={seg.dimColor}
          inverse={seg.inverse}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
};
