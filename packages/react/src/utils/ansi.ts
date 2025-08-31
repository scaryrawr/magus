export type AnsiSegment = {
  text: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  dimColor?: boolean;
  inverse?: boolean;
};

// Map standard and bright colors
const fgBase: Record<number, string> = {
  30: "black",
  31: "red",
  32: "green",
  33: "yellow",
  34: "blue",
  35: "magenta",
  36: "cyan",
  37: "white",
};

const fgBright: Record<number, string> = {
  90: "gray",
  91: "red",
  92: "green",
  93: "yellow",
  94: "blue",
  95: "magenta",
  96: "cyan",
  97: "white",
};

const bgBase: Record<number, string> = {
  40: "black",
  41: "red",
  42: "green",
  43: "yellow",
  44: "blue",
  45: "magenta",
  46: "cyan",
  47: "white",
};

const bgBright: Record<number, string> = {
  100: "gray",
  101: "red",
  102: "green",
  103: "yellow",
  104: "blue",
  105: "magenta",
  106: "cyan",
  107: "white",
};

const isDigitOrSemicolon = (ch: string) => (ch >= "0" && ch <= "9") || ch === ";";

// Parse ANSI SGR sequences into styled segments suitable for Ink <Text>
export function parseAnsiToSegments(input: string | undefined | null): AnsiSegment[] {
  const str = input ?? "";
  if (str.length === 0) return [{ text: "" }];

  const ESC = "\u001b"; // \x1b

  let i = 0;
  let curFg: string | undefined;
  let curBg: string | undefined;
  let buf = "";
  let curBold = false;
  let curUnderline = false;
  let curItalic = false;
  let curStrikethrough = false;
  let curDim = false;
  let curInverse = false;
  const out: AnsiSegment[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    out.push({
      text: buf,
      color: curFg,
      backgroundColor: curBg,
      bold: curBold || undefined,
      underline: curUnderline || undefined,
      italic: curItalic || undefined,
      strikethrough: curStrikethrough || undefined,
      dimColor: curDim || undefined,
      inverse: curInverse || undefined,
    });
    buf = "";
  };

  const applySgr = (params: number[]) => {
    if (params.length === 0) {
      curFg = undefined;
      curBg = undefined;
      curBold = false;
      curUnderline = false;
      curItalic = false;
      curStrikethrough = false;
      curDim = false;
      curInverse = false;
      return;
    }
    let idx = 0;
    while (idx < params.length) {
      const p = params[idx++];
      if (p === 0) {
        curFg = undefined;
        curBg = undefined;
        curBold = false;
        curUnderline = false;
        curItalic = false;
        curStrikethrough = false;
        curDim = false;
        curInverse = false;
      } else if ((p >= 30 && p <= 37) || (p >= 90 && p <= 97)) {
        curFg = fgBase[p] ?? fgBright[p] ?? curFg;
      } else if ((p >= 40 && p <= 47) || (p >= 100 && p <= 107)) {
        curBg = bgBase[p] ?? bgBright[p] ?? curBg;
      } else if (p === 39) {
        curFg = undefined;
      } else if (p === 49) {
        curBg = undefined;
      } else if (p === 1) {
        // Bold on
        curBold = true;
      } else if (p === 2) {
        // Faint (dim) on
        curDim = true;
      } else if (p === 22) {
        // Bold/faint off
        curBold = false;
        curDim = false;
      } else if (p === 4) {
        // Underline on
        curUnderline = true;
      } else if (p === 24) {
        // Underline off
        curUnderline = false;
      } else if (p === 3) {
        // Italic on
        curItalic = true;
      } else if (p === 23) {
        // Italic off
        curItalic = false;
      } else if (p === 9) {
        // Strikethrough on
        curStrikethrough = true;
      } else if (p === 29) {
        // Strikethrough off
        curStrikethrough = false;
      } else if (p === 7) {
        // Inverse on
        curInverse = true;
      } else if (p === 27) {
        // Inverse off
        curInverse = false;
      } else if (p === 38 || p === 48) {
        const isFg = p === 38;
        const mode = params[idx++];
        if (mode === 2) {
          const r = params[idx++];
          const g = params[idx++];
          const b = params[idx++];
          if (
            Number.isFinite(r) &&
            Number.isFinite(g) &&
            Number.isFinite(b) &&
            r >= 0 &&
            r <= 255 &&
            g >= 0 &&
            g <= 255 &&
            b >= 0 &&
            b <= 255
          ) {
            const hex = `#${r.toString(16).padStart(2, "0")}${g
              .toString(16)
              .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            if (isFg) curFg = hex;
            else curBg = hex;
          }
        } else if (mode === 5) {
          const n = params[idx++];
          if (typeof n === "number" && n >= 0 && n <= 255) {
            const toHex = (num: number) => num.toString(16).padStart(2, "0");
            const idx256 = n;
            let hex: string | undefined;
            if (idx256 < 16) {
              // Standard 16-color palette
              const standardHex: Record<number, string> = {
                0: "#000000",
                1: "#800000",
                2: "#008000",
                3: "#808000",
                4: "#000080",
                5: "#800080",
                6: "#008080",
                7: "#c0c0c0",
                8: "#808080",
                9: "#ff0000",
                10: "#00ff00",
                11: "#ffff00",
                12: "#0000ff",
                13: "#ff00ff",
                14: "#00ffff",
                15: "#ffffff",
              };
              hex = standardHex[idx256];
            } else if (idx256 >= 16 && idx256 <= 231) {
              const n2 = idx256 - 16;
              const r = Math.floor(n2 / 36);
              const g = Math.floor((n2 % 36) / 6);
              const b = n2 % 6;
              const levels = [0, 95, 135, 175, 215, 255];
              const R = levels[r];
              const G = levels[g];
              const B = levels[b];
              hex = `#${toHex(R)}${toHex(G)}${toHex(B)}`;
            } else if (idx256 >= 232 && idx256 <= 255) {
              const c = 8 + 10 * (idx256 - 232);
              hex = `#${toHex(c)}${toHex(c)}${toHex(c)}`;
            }
            if (hex) {
              if (isFg) curFg = hex;
              else curBg = hex;
            }
          }
        }
      }
      // ignore other SGR (bold/underline/etc.)
    }
  };

  while (i < str.length) {
    const ch = str[i];
    if (ch === ESC) {
      const next = str[i + 1];
      if (next === "[") {
        // CSI ... possible SGR
        let j = i + 2;
        // Only digits and semicolons are valid before 'm' in SGR
        while (j < str.length && isDigitOrSemicolon(str[j])) j++;
        if (j < str.length && str[j] === "m") {
          // It's an SGR sequence
          flush();
          const paramStr = str.slice(i + 2, j);
          const params = paramStr
            .split(";")
            .filter((s) => s.length > 0)
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
          applySgr(params);
          i = j + 1;
          continue;
        } else {
          // Not an SGR; skip until the final byte of CSI (0x40-0x7E)
          while (j < str.length) {
            const code = str.charCodeAt(j);
            if (code >= 0x40 && code <= 0x7e) {
              j++;
              break;
            }
            j++;
          }
          // skip unknown CSI entirely
          i = j;
          continue;
        }
      } else if (next === "]") {
        // OSC ... BEL or ST terminated – skip it entirely
        let j = i + 2;
        while (j < str.length) {
          if (str[j] === "\u0007") {
            j++;
            break;
          }
          if (str[j] === ESC && str[j + 1] === "\\") {
            j += 2;
            break;
          }
          j++;
        }
        i = j;
        continue;
      } else {
        // Some other escape – drop the ESC and continue
        i += 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out.length > 0 ? out : [{ text: str }];
}

// Streaming parser -----------------------------------------------------------

export type AnsiStreamParser = {
  // Push a new chunk. Returns finalized segments for this chunk.
  // Note: Segments may share identical styles across calls; callers may choose to merge.
  push: (chunk: string | undefined | null) => AnsiSegment[];
  // Flush any buffered text into a final segment list.
  flush: () => AnsiSegment[];
  // Reset to initial state.
  reset: () => void;
};

// Create a streaming ANSI parser that maintains style and escape sequence state across chunks.
export function createAnsiStreamParser(): AnsiStreamParser {
  const ESC = "\u001b";

  // Style state
  let curFg: string | undefined;
  let curBg: string | undefined;
  let curBold = false;
  let curUnderline = false;
  let curItalic = false;
  let curStrikethrough = false;
  let curDim = false;
  let curInverse = false;

  // Parsing buffers
  let textBuf = ""; // accumulates visible text for current style
  let pending = ""; // holds any partial escape/OSC sequence across chunks

  const makeSeg = (txt: string): AnsiSegment => ({
    text: txt,
    color: curFg,
    backgroundColor: curBg,
    bold: curBold || undefined,
    underline: curUnderline || undefined,
    italic: curItalic || undefined,
    strikethrough: curStrikethrough || undefined,
    dimColor: curDim || undefined,
    inverse: curInverse || undefined,
  });

  const applySgr = (params: number[]) => {
    if (params.length === 0) {
      curFg = undefined;
      curBg = undefined;
      curBold = false;
      curUnderline = false;
      curItalic = false;
      curStrikethrough = false;
      curDim = false;
      curInverse = false;
      return;
    }
    let idx = 0;
    while (idx < params.length) {
      const p = params[idx++];
      if (p === 0) {
        curFg = undefined;
        curBg = undefined;
        curBold = false;
        curUnderline = false;
        curItalic = false;
        curStrikethrough = false;
        curDim = false;
        curInverse = false;
      } else if ((p >= 30 && p <= 37) || (p >= 90 && p <= 97)) {
        curFg = fgBase[p] ?? fgBright[p] ?? curFg;
      } else if ((p >= 40 && p <= 47) || (p >= 100 && p <= 107)) {
        curBg = bgBase[p] ?? bgBright[p] ?? curBg;
      } else if (p === 39) {
        curFg = undefined;
      } else if (p === 49) {
        curBg = undefined;
      } else if (p === 1) {
        curBold = true;
      } else if (p === 2) {
        curDim = true;
      } else if (p === 22) {
        curBold = false;
        curDim = false;
      } else if (p === 4) {
        curUnderline = true;
      } else if (p === 24) {
        curUnderline = false;
      } else if (p === 3) {
        curItalic = true;
      } else if (p === 23) {
        curItalic = false;
      } else if (p === 9) {
        curStrikethrough = true;
      } else if (p === 29) {
        curStrikethrough = false;
      } else if (p === 7) {
        curInverse = true;
      } else if (p === 27) {
        curInverse = false;
      } else if (p === 38 || p === 48) {
        const isFg = p === 38;
        const mode = params[idx++];
        if (mode === 2) {
          const r = params[idx++];
          const g = params[idx++];
          const b = params[idx++];
          if (
            Number.isFinite(r) &&
            Number.isFinite(g) &&
            Number.isFinite(b) &&
            r >= 0 &&
            r <= 255 &&
            g >= 0 &&
            g <= 255 &&
            b >= 0 &&
            b <= 255
          ) {
            const hex = `#${r.toString(16).padStart(2, "0")}${g
              .toString(16)
              .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            if (isFg) curFg = hex;
            else curBg = hex;
          }
        } else if (mode === 5) {
          const n = params[idx++];
          if (typeof n === "number" && n >= 0 && n <= 255) {
            const toHex = (num: number) => num.toString(16).padStart(2, "0");
            const idx256 = n;
            let hex: string | undefined;
            if (idx256 < 16) {
              const standardHex: Record<number, string> = {
                0: "#000000",
                1: "#800000",
                2: "#008000",
                3: "#808000",
                4: "#000080",
                5: "#800080",
                6: "#008080",
                7: "#c0c0c0",
                8: "#808080",
                9: "#ff0000",
                10: "#00ff00",
                11: "#ffff00",
                12: "#0000ff",
                13: "#ff00ff",
                14: "#00ffff",
                15: "#ffffff",
              };
              hex = standardHex[idx256];
            } else if (idx256 >= 16 && idx256 <= 231) {
              const n2 = idx256 - 16;
              const r = Math.floor(n2 / 36);
              const g = Math.floor((n2 % 36) / 6);
              const b = n2 % 6;
              const levels = [0, 95, 135, 175, 215, 255];
              const R = levels[r];
              const G = levels[g];
              const B = levels[b];
              hex = `#${toHex(R)}${toHex(G)}${toHex(B)}`;
            } else if (idx256 >= 232 && idx256 <= 255) {
              const c = 8 + 10 * (idx256 - 232);
              hex = `#${toHex(c)}${toHex(c)}${toHex(c)}`;
            }
            if (hex) {
              if (isFg) curFg = hex;
              else curBg = hex;
            }
          }
        }
      }
    }
  };

  const parseChunk = (input: string): AnsiSegment[] => {
    const out: AnsiSegment[] = [];
    const str = pending + (input ?? "");
    pending = "";
    let i = 0;

    const flushText = () => {
      if (textBuf.length === 0) return;
      out.push(makeSeg(textBuf));
      textBuf = "";
    };

    while (i < str.length) {
      const ch = str[i];
      if (ch === ESC) {
        const next = str[i + 1];
        if (next === "[") {
          let j = i + 2;
          while (j < str.length && isDigitOrSemicolon(str[j])) j++;
          if (j < str.length) {
            if (str[j] === "m") {
              // SGR complete
              flushText();
              const paramStr = str.slice(i + 2, j);
              const params = paramStr
                .split(";")
                .filter((s) => s.length > 0)
                .map((s) => Number(s))
                .filter((n) => Number.isFinite(n));
              applySgr(params);
              i = j + 1;
              continue;
            }
            // Another CSI sequence; skip to final byte [@-~]
            while (j < str.length) {
              const code = str.charCodeAt(j);
              if (code >= 0x40 && code <= 0x7e) {
                j++;
                break;
              }
              j++;
            }
            // discard unknown CSI
            i = j;
            continue;
          }
          // Incomplete CSI at end of chunk; stash from ESC
          pending = str.slice(i);
          break;
        } else if (next === "]") {
          // OSC ... terminated by BEL or ST; may span chunks
          let j = i + 2;
          let terminated = false;
          while (j < str.length) {
            if (str[j] === "\u0007") {
              j++;
              terminated = true;
              break;
            }
            if (str[j] === ESC && str[j + 1] === "\\") {
              j += 2;
              terminated = true;
              break;
            }
            j++;
          }
          if (!terminated) {
            // Incomplete OSC across chunk boundary; stash and stop
            pending = str.slice(i);
            break;
          }
          // Consumed OSC; drop it
          i = j;
          continue;
        } else {
          // Other escape; drop ESC
          i += 1;
          continue;
        }
      }
      textBuf += ch;
      i++;
    }
    // Flush any visible text parsed in this chunk
    flushText();
    return out;
  };

  return {
    push: (chunk) => parseChunk(chunk ?? ""),
    flush: () => {
      const out: AnsiSegment[] = [];
      if (pending) {
        // pending contains an incomplete escape; drop it on flush
        pending = "";
      }
      if (textBuf.length > 0) {
        out.push(makeSeg(textBuf));
        textBuf = "";
      }
      return out;
    },
    reset: () => {
      curFg = undefined;
      curBg = undefined;
      curBold = false;
      curUnderline = false;
      curItalic = false;
      curStrikethrough = false;
      curDim = false;
      curInverse = false;
      textBuf = "";
      pending = "";
    },
  };
}
