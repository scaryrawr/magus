import { Text } from "ink";
import React, { useEffect } from "react";
import stripAnsi from "strip-ansi";
import { createAnsiStreamParser, type AnsiSegment } from "../utils/ansi";
type SubprocessOutputProps = {
  command: string;
  args?: string[];
  children: string | undefined;
};

export const SubprocessOutput: React.FC<SubprocessOutputProps> = ({ command, args, children: stdin }) => {
  const [segments, setSegments] = React.useState<AnsiSegment[]>([]);
  const parserRef = React.useRef(createAnsiStreamParser());

  const appendSegments = React.useCallback((incoming: AnsiSegment[]) => {
    if (incoming.length === 0) return;
    setSegments((prev) => {
      if (prev.length === 0) return incoming;

      const merged = [...prev];
      let last = merged[merged.length - 1];
      for (const seg of incoming) {
        const sameStyle =
          last.color === seg.color &&
          last.backgroundColor === seg.backgroundColor &&
          last.bold === seg.bold &&
          last.underline === seg.underline &&
          last.italic === seg.italic &&
          last.strikethrough === seg.strikethrough &&
          last.dimColor === seg.dimColor &&
          last.inverse === seg.inverse;
        if (sameStyle) {
          last = { ...last, text: stripAnsi((last.text ?? "") + seg.text) };
          merged[merged.length - 1] = last;
        } else {
          merged.push(seg);
          last = seg;
        }
      }
      return merged;
    });
  }, []);

  // Ensure a stable dependency when args is omitted (avoid new [] identity each render)
  const { argsArr } = React.useMemo(() => {
    const arr = args ?? [];
    return { argsArr: arr };
  }, [args]);

  const process = React.useMemo(() => {
    const stdinBuffer = stdin ? new TextEncoder().encode(stdin) : undefined;

    return Bun.spawn([command, ...argsArr], {
      stdin: stdinBuffer,
    });
  }, [argsArr, command, stdin]);

  useEffect(() => {
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
            const segs = parserRef.current.push(chunk);
            appendSegments(segs);
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

    // Start reading stream
    const abortController = new AbortController();
    readOutput(abortController.signal);

    return () => {
      abortController.abort();
      stdout.cancel().catch(() => {
        // ignore errors on cancel
      });
    };
  }, [process, appendSegments]);

  // Reset segments and parser whenever the process object changes (i.e., new command/args/stdin)
  React.useEffect(() => {
    setSegments([]);
    parserRef.current.reset();
  }, [process]);

  // When the process exits, flush any buffered text into segments
  React.useEffect(() => {
    let disposed = false;
    process.exited.then(() => {
      if (disposed) return;
      const tail = parserRef.current.flush();
      appendSegments(tail);
    });
    return () => {
      disposed = true;
    };
  }, [process, appendSegments]);

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
