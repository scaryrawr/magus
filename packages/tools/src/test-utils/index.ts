// Shared test utilities for handling tool outputs that may stream

export const isAsyncIterable = <T = unknown>(v: unknown): v is AsyncIterable<T> => {
  if (v == null) return false;
  const candidate = v as { [Symbol.asyncIterator]?: unknown };
  return typeof candidate[Symbol.asyncIterator] === "function";
};

export async function resolveToolOutput<T>(value: T | AsyncIterable<T>): Promise<T> {
  if (isAsyncIterable<T>(value)) {
    let last: T | undefined;
    for await (const chunk of value) {
      last = chunk;
    }
    if (last === undefined) {
      throw new Error("No output produced by AsyncIterable result");
    }
    return last;
  }
  return value;
}
