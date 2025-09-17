import { tool, type ToolSet } from "ai";
import TurndownService from "turndown";
import z from "zod";

export const WebFetchInputSchema = z.object({
  url: z.url().describe("The URL of the web page to fetch."),
});

export const WebFetchOutputSchema = z.object({
  content: z.string().describe("The content of the fetched web page."),
});

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;
export type WebFetchOutput = z.infer<typeof WebFetchOutputSchema>;

export type WebFetchOptions = {
  toMarkdown: (content: string) => Promise<string>;
};

export const webfetch = async (
  { url: urlStr }: WebFetchInput,
  { toMarkdown }: WebFetchOptions,
): Promise<WebFetchOutput> => {
  const url = new URL(urlStr);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS protocols are supported.");
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, 10000); // 10 seconds timeout

  try {
    const response = await fetch(url, { signal: abortController.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url.href}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 5_000_000) {
      throw new Error("Response too large (over 5MB).");
    }

    let content = new TextDecoder().decode(arrayBuffer);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      content = await toMarkdown(content);
    }

    return { content };
  } finally {
    clearTimeout(timeout);
  }
};

export const createWebFetchTool = () => {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  return {
    webfetch: tool({
      description: `Use this tool when you need to retrieve information from the web, such as reading articles, accessing documentation, or gathering data from online sources.
      If the user shares a URL, you MUST use this tool to fetch the contents of the shared URL.
      HTML content will be converted to markdown format for easier reading and processing.`,
      inputSchema: WebFetchInputSchema,
      outputSchema: WebFetchOutputSchema,
      execute: (input): Promise<WebFetchOutput> => {
        return webfetch(input, {
          toMarkdown: (content: string) => {
            return Promise.resolve(turndownService.turndown(content));
          },
        });
      },
    }),
  } satisfies ToolSet;
};
export type WebFetchToolSet = ReturnType<typeof createWebFetchTool>;
