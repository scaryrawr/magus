import { render } from "ink";
import { App } from "./App";
import { ServerProvider } from "./contexts";
import { createServer } from "@magus/server";
import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";

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
