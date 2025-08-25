import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import {
  createFileCreateTool,
  createInsertTool,
  createShellTool,
  createStrReplaceTool,
  createViewTool,
} from "@magus/tools";
import { render } from "ink";
import { App } from "./app";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const service = createServer({
    providers,
    model: providers[0].model("openai/gpt-oss-20b"),
    tools: {
      ...createShellTool(),
      ...createViewTool(),
      ...createStrReplaceTool(),
      ...createFileCreateTool(),
      ...createInsertTool(),
    },
  });

  return {
    server: service.listen(),
    state: service.state,
  };
};

try {
  await render(<App createServer={createMagusServer} />).waitUntilExit();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
