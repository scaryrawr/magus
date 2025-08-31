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
  const process = React.useMemo(() => {
    const stdinBuffer = stdin ? new TextEncoder().encode(stdin) : undefined;

    return Bun.spawn([command, ...args], {
      stdin: stdinBuffer,
    });
  }, [args, command, stdin]);

  React.useEffect(() => {
    const stdout = process.stdout.getReader();
    const readOutput = async (signal: AbortSignal) => {
      try {
        const aborted = new Promise<{ done: true; value: undefined }>((res) => {
          signal.addEventListener("abort", () => res({ done: true, value: undefined }), { once: true });
        });
        while (!signal.aborted) {
          const { done, value } = await Promise.race([
            stdout.read(),
            aborted,
            process.exited.then(() => ({ done: true, value: undefined })),
          ]);
          if (signal.aborted || done) break;
          if (value) setOutput((prev) => prev + Buffer.from(value).toString());
        }
      } finally {
        try {
          stdout.releaseLock();
        } catch {
          // ignore
        }
      }
    };

    // Start reading stream
    const abortController = new AbortController();
    readOutput(abortController.signal);

    return () => {
      abortController.abort();
      stdout.cancel().catch(() => {});
    };
  }, [process]);

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
