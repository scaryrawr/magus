import type { CardinalOptions } from "cardinal";
import { Text } from "ink";
import { Marked, type MarkedExtension } from "marked";
import { markedTerminal, type TerminalRendererOptions } from "marked-terminal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStdoutDimensions } from "../hooks/useStdoutDimensions";

export type MarkdownProps = {
  children: string;
  options?: TerminalRendererOptions;
  highlightOptions?: CardinalOptions;
};

export const Markdown = ({ children, options, highlightOptions }: MarkdownProps) => {
  const [text, setText] = useState(children);
  const { columns: stdoutColumns } = useStdoutDimensions();

  // Compute available width (priority: user-provided option, then stdout, then fallback)
  const availableWidth = useMemo(() => {
    const optWidth = options?.width;
    if (typeof optWidth === "number" && Number.isFinite(optWidth) && optWidth > 0) return optWidth;
    if (typeof stdoutColumns === "number" && stdoutColumns > 0) return stdoutColumns;
    return typeof process?.stdout?.columns === "number" && process.stdout.columns > 0 ? process.stdout.columns : 80;
  }, [options?.width, stdoutColumns]);

  // Very small helper utilities to compute table col widths based on content and terminal width
  const computeMaxTableColumns = useCallback((md: string): number => {
    // Strip fenced code blocks to avoid false-positive pipes
    const withoutCode = md.replace(/```[\s\S]*?```/g, "");
    const lines = withoutCode.split(/\r?\n/);
    const isDelimiter = (line: string) => {
      const t = line.trim();
      if (!t.includes("|")) return false;
      if (!t.includes("-")) return false;
      // only allow characters that typically appear in delimiter rows
      const onlyAllowed = /^\|?\s*[:\-\s|]+\|?\s*$/.test(t);
      return onlyAllowed;
    };

    const countColumnsFromDelimiter = (line: string): number => {
      const t = line.trim();
      const pipes = (t.match(/\|/g) || []).length;
      const starts = t.startsWith("|");
      const ends = t.endsWith("|");
      if (starts && ends) return Math.max(1, pipes - 1);
      if (starts || ends) return Math.max(1, pipes);
      return Math.max(1, pipes + 1);
    };

    let maxCols = 0;
    for (const line of lines) {
      if (isDelimiter(line)) {
        const cols = countColumnsFromDelimiter(line);
        if (cols > maxCols) maxCols = cols;
      }
    }
    return maxCols;
  }, []);

  type TableStyle = { [K in "padding-left" | "padding-right"]?: number };
  type TableOptionsPartial = { style?: TableStyle; colWidths?: number[] };

  const computeColWidths = useCallback(
    (width: number, numCols: number): number[] | undefined => {
      if (!numCols || numCols <= 0) return undefined;
      // Determine padding and overhead based on cli-table3 defaults or user overrides
      const tableOpts: TableOptionsPartial = options?.tableOptions ?? {};
      const paddingLeft = tableOpts.style?.["padding-left"] ?? 1;
      const paddingRight = tableOpts.style?.["padding-right"] ?? 1;
      const padPerCol = Number(paddingLeft) + Number(paddingRight);
      // Borders: left + right + middle separators between columns
      const verticals = numCols + 1;
      const overhead = verticals + padPerCol * numCols;
      const contentBudget = Math.max(0, width - overhead);
      const minPerCol = 3; // cli-table3 works best with >=3 when wrapping
      const base = Math.max(minPerCol, Math.floor(contentBudget / numCols));
      const widths = Array.from({ length: numCols }, () => base);
      // Distribute any remaining space one by one from the start
      let remaining = contentBudget - base * numCols;
      let idx = 0;
      while (remaining > 0 && idx < widths.length) {
        widths[idx++] += 1;
        remaining -= 1;
        if (idx === widths.length) idx = 0;
      }
      return widths;
    },
    [options?.tableOptions],
  );

  const markedInstance = useMemo(() => {
    const maxCols = computeMaxTableColumns(children);
    const userTableOptions = (options?.tableOptions ?? {}) as TableOptionsPartial;
    const hasUserColWidths = typeof userTableOptions.colWidths !== "undefined";
    const tableOptions: TerminalRendererOptions["tableOptions"] = {
      ...userTableOptions,
      wordWrap: true,
      ...(hasUserColWidths ? {} : { colWidths: computeColWidths(availableWidth, maxCols) }),
    };

    return new Marked(
      markedTerminal(
        {
          ...options,
          // Reflow plain text to terminal width
          reflowText: true,
          width: availableWidth,
          tableOptions,
        },
        highlightOptions,
      ) as MarkedExtension,
    );
  }, [children, availableWidth, highlightOptions, options, computeColWidths, computeMaxTableColumns]);

  useEffect(() => {
    let disposed = false;
    markedInstance
      .parse(children, {
        async: true,
      })
      .then((result) => {
        if (!disposed) setText(result);
      });
    return () => {
      disposed = true;
    };
  }, [children, markedInstance]);
  return <Text>{text}</Text>;
};
