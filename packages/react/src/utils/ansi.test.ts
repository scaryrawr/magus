import { describe, expect, it } from "bun:test";
import { createAnsiStreamParser, parseAnsiToSegments } from "./ansi";

const ESC = "\u001b";

describe("parseAnsiToSegments", () => {
  it("returns plain text when no ansi", () => {
    const segs = parseAnsiToSegments("hello world");
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("hello world");
    expect(segs[0].color).toBeUndefined();
    expect(segs[0].backgroundColor).toBeUndefined();
  });

  it("handles simple foreground color", () => {
    const input = `${ESC}[31mred${ESC}[0m normal`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "red", color: "red", backgroundColor: undefined });
    expect(segs[1]).toEqual({ text: " normal", color: undefined, backgroundColor: undefined });
  });

  it("handles background color", () => {
    const input = `${ESC}[42mgreenbg${ESC}[49m after`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "greenbg", color: undefined, backgroundColor: "green" });
    expect(segs[1]).toEqual({ text: " after", color: undefined, backgroundColor: undefined });
  });

  it("handles 24-bit truecolor", () => {
    const input = `${ESC}[38;2;255;0;0mR${ESC}[0m`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ text: "R", color: "#ff0000", backgroundColor: undefined });
  });

  it("handles multiple segments and nested resets", () => {
    const input = `${ESC}[31mred ${ESC}[42mred-on-green${ESC}[39m default-fg${ESC}[0m done`;
    const segs = parseAnsiToSegments(input);
    expect(segs.map((s) => s.text).join("")).toBe("red red-on-green default-fg done");
    expect(segs[0].color).toBe("red");
    expect(segs[1].color).toBe("red");
    expect(segs[1].backgroundColor).toBe("green");
    expect(segs[2].color).toBeUndefined();
    expect(segs[2].backgroundColor).toBe("green");
  });

  it("skips unknown CSI and OSC sequences", () => {
    // Insert an OSC 0;title BEL sequence and an unrelated CSI cursor move
    const input = `a${ESC}]0;title\u0007b${ESC}[2Acd`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("abcd");
  });

  it("supports bold on/off", () => {
    const input = `${ESC}[1mbold${ESC}[22m plain`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "bold", color: undefined, backgroundColor: undefined, bold: true });
    expect(segs[1]).toEqual({ text: " plain", color: undefined, backgroundColor: undefined });
  });

  it("supports underline on/off", () => {
    const input = `${ESC}[4munder${ESC}[24m line`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "under", color: undefined, backgroundColor: undefined, underline: true });
    expect(segs[1]).toEqual({ text: " line", color: undefined, backgroundColor: undefined });
  });

  it("supports combined styles with colors", () => {
    const input = `${ESC}[1;4;31;42mbu${ESC}[0m`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ text: "bu", color: "red", backgroundColor: "green", bold: true, underline: true });
  });

  it("supports italics on/off", () => {
    const input = `${ESC}[3mit${ESC}[23malic`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "it", color: undefined, backgroundColor: undefined, italic: true });
    expect(segs[1]).toEqual({ text: "alic", color: undefined, backgroundColor: undefined });
  });

  it("supports italics with other styles", () => {
    const input = `${ESC}[3;1;4;34mX${ESC}[0m`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({
      text: "X",
      color: "blue",
      backgroundColor: undefined,
      bold: true,
      underline: true,
      italic: true,
    });
  });

  it("supports strikethrough on/off", () => {
    const input = `${ESC}[9mS${ESC}[29mT`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "S", color: undefined, backgroundColor: undefined, strikethrough: true });
    expect(segs[1]).toEqual({ text: "T", color: undefined, backgroundColor: undefined });
  });

  it("supports 256-color palette mapping", () => {
    const input = `${ESC}[38;5;196mR${ESC}[48;5;21mB${ESC}[0m`;
    const segs = parseAnsiToSegments(input);
    // 196 ~ bright red from xterm palette (approx #ff0000); 21 is a blue (~#005fff)
    expect(segs[0].color?.startsWith("#")).toBe(true);
    expect(segs[1].backgroundColor?.startsWith("#")).toBe(true);
  });

  it("supports faint (dim) on/off and reset", () => {
    const input = `${ESC}[2mdim${ESC}[22m normal ${ESC}[2md2${ESC}[0m`;
    const segs = parseAnsiToSegments(input);
    // segments: [dim, ' normal ', d2]
    expect(segs[0]).toEqual({ text: "dim", color: undefined, backgroundColor: undefined, dimColor: true });
    expect(segs[1]).toEqual({ text: " normal ", color: undefined, backgroundColor: undefined });
    expect(segs[2]).toEqual({ text: "d2", color: undefined, backgroundColor: undefined, dimColor: true });
  });

  it("supports inverse on/off", () => {
    const input = `${ESC}[7mI${ESC}[27mN`;
    const segs = parseAnsiToSegments(input);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ text: "I", color: undefined, backgroundColor: undefined, inverse: true });
    expect(segs[1]).toEqual({ text: "N", color: undefined, backgroundColor: undefined });
  });
});

describe("createAnsiStreamParser (streaming)", () => {
  it("handles SGR split across chunks", () => {
    const p = createAnsiStreamParser();
    const segs1 = p.push(`${ESC}[3`);
    expect(segs1).toHaveLength(0);
    const segs2 = p.push(`1mred`);
    const segs3 = p.push(`${ESC}[0mX`);
    const all = [...segs2, ...segs3];
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual({ text: "red", color: "red", backgroundColor: undefined });
    expect(all[1]).toEqual({ text: "X", color: undefined, backgroundColor: undefined });
  });

  it("handles OSC split across chunks by dropping it", () => {
    const p = createAnsiStreamParser();
    const a = p.push(`a${ESC}]0;title`);
    const b = p.push(`b`);
    const all = [...a, ...b];
    expect(all.map((s) => s.text).join("")).toBe("ab");
  });

  it("merges plain text across chunks when no style change", () => {
    const p = createAnsiStreamParser();
    const s1 = p.push("foo");
    const s2 = p.push("bar");
    const s3 = p.flush();
    // The parser returns segments per chunk; caller merges. Here we simply ensure they share style.
    const all = [...s1, ...s2, ...s3];
    expect(all).toHaveLength(2); // 'foo' and 'bar' flushed
    expect(all[0].text).toBe("foo");
    expect(all[1].text).toBe("bar");
    expect(all[0].color).toBeUndefined();
    expect(all[1].color).toBeUndefined();
  });
});
