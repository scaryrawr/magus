import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import { render } from "ink";
import { App } from "./app";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const service = createServer({
    providers,
    model: providers[0].model("openai/gpt-oss-20b"),
  });

  return service.listen();
};

await render(<App createServer={createMagusServer} />).waitUntilExit();
