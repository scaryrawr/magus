import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import { render } from "ink";
import { App } from "./app";
import { ServerProvider } from "./contexts";

const providers = [createLmStudioProvider(), createOllamaProvider()];
const service = createServer({
  providers,
  model: providers[0].model("openai/gpt-oss-20b"),
});

const server = service.listen();

await render(
  <ServerProvider server={server}>
    <App />
  </ServerProvider>,
).waitUntilExit();

server.stop();
