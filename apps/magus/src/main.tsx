import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import {
  createCreateFileTool,
  createInsertTool,
  createShellTool,
  createStringReplaceTool,
  createViewTool,
} from "@magus/tools";
import { render } from "ink";
import { App } from "./app";
import { ServerProvider } from "./contexts";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const service = createServer({
    providers,
    model: providers[0].model("openai/gpt-oss-20b"),
    tools: {
      ...createShellTool(),
      //...createEditorTool(),
      ...createCreateFileTool(),
      ...createInsertTool(),
      ...createViewTool(),
      ...createStringReplaceTool(),
    },
  });

  return {
    server: service.listen(),
    state: service.state,
  };
};

try {
  await render(
    <ServerProvider createServer={createMagusServer}>
      <App />
    </ServerProvider>,
  ).waitUntilExit();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
