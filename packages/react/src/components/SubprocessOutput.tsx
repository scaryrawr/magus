// No direct Text import; using AnsiText component
import React from "react";
import { AnsiText } from "./AnsiText";

type SubprocessOutputProps = {
  command: string;
  args?: string[];
  children: string | undefined;
};

export const SubprocessOutput: React.FC<SubprocessOutputProps> = ({ command, args, children: stdin }) => {
  const [output, setOutput] = React.useState<string>("");

  const process = React.useMemo(() => {
    const stdinBuffer = stdin ? new TextEncoder().encode(stdin) : undefined;

    return Bun.spawn(args ? [command, ...args] : [command], {
      stdin: stdinBuffer,
    });
  }, [args, command, stdin]);

  React.useEffect(() => {
    return () => {
      try {
        process.kill();
      } catch {
        // ignore
      }
    };
  }, [process]);

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
          if (value) {
            const chunk = Buffer.from(value).toString();
            setOutput((prev) => prev + chunk);
          }
        }
      } finally {
        try {
          stdout.releaseLock();
        } catch {
          // ignore
        }
      }
    };

    const abortController = new AbortController();
    void readOutput(abortController.signal);

    return () => {
      abortController.abort();
      stdout.cancel().catch(() => {
        // ignore errors on cancel
      });
    };
  }, [process]);

  // Reset output when the process changes (new command/args/stdin)
  React.useEffect(() => {
    setOutput("");
  }, [process]);

  return <AnsiText>{output}</AnsiText>;
};
