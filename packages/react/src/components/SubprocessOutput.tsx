// No direct Text import; using AnsiText component
import { spawn, spawnSync } from "node:child_process";
import React from "react";
import { AnsiText } from "./AnsiText";

type SubprocessOutputProps = {
  command: string;
  args?: string[];
  children: string | undefined;
  streaming?: boolean;
};

export const SubprocessOutputStreaming: React.FC<SubprocessOutputProps> = ({ command, args, children: stdin }) => {
  const [output, setOutput] = React.useState<string>("");

  const process = React.useMemo(() => {
    const child = spawn(command, args || [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    return child;
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
    if (!process.stdout) return;

    const readOutput = async (signal: AbortSignal) => {
      try {
        const aborted = new Promise<void>((res) => {
          signal.addEventListener("abort", () => res(), { once: true });
        });

        const handleData = (chunk: Buffer) => {
          if (!signal.aborted) {
            setOutput((prev) => prev + chunk.toString());
          }
        };

        const handleEnd = () => {
          // Stream ended, nothing more to do
        };

        process.stdout.on("data", handleData);
        process.stdout.on("end", handleEnd);

        // Wait for either abort or process exit
        await Promise.race([
          aborted,
          new Promise<void>((resolve) => {
            process.on("exit", () => resolve());
          }),
        ]);

        // Clean up listeners
        process.stdout.off("data", handleData);
        process.stdout.off("end", handleEnd);
      } catch {
        // ignore errors during cleanup
      }
    };

    const abortController = new AbortController();
    void readOutput(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [process]);

  // Reset output when the process changes (new command/args/stdin)
  React.useEffect(() => {
    setOutput("");
  }, [process]);

  return <AnsiText>{output}</AnsiText>;
};

export const SubprocessOutputSync: React.FC<SubprocessOutputProps> = ({ command, args, children: stdin }) => {
  const [output, setOutput] = React.useState<string>("");

  React.useEffect(() => {
    const proc = spawnSync(command, args || [], {
      input: stdin,
      encoding: "utf8",
    });

    setOutput(proc.stdout || "");
  }, [args, command, stdin]);

  return <AnsiText>{output}</AnsiText>;
};

export const SubprocessOutput: React.FC<SubprocessOutputProps> = (props) => {
  if (props.streaming) {
    return <SubprocessOutputStreaming {...props} />;
  }

  return <SubprocessOutputSync {...props} />;
};
