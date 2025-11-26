# @magus/providers

LLM provider integration layer. Each provider returns a lightweight object exposing standardized `model(id)` and `models()` functions used by the server + CLI to enumerate and invoke language models.

## Implemented Providers

- Azure (Azure AI Studio / OpenAI-compatible) with reasoning tag extraction middleware
- LM Studio (local inference)
- Ollama (local models)
- OpenRouter (multi-provider gateway)

## Example

```ts
import { createOpenRouterProvider } from "@magus/providers";

const { OpenRouter } = createOpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY! });

const list = await OpenRouter.models();
const completion = await OpenRouter.model("openrouter/auto").stream({ prompt: "Hello" });
```

## Design

- Providers return a namespaced object so multiple can coexist without collision.
- Model metadata shape validated by `ModelInfoSchema` (Zod) for consistency.
- Reasoning tag extraction applied where vendor includes hidden chain-of-thought markers.

## Install

```bash
bun install
```

## Testing

```bash
bun test --filter @magus/providers
```

## Adding a Provider

1. Create `<provider>.ts` implementing a factory returning `{ ProviderName: { model, models } }`.
2. Validate remote responses with Zod schemas local to that file.
3. Export from `src/index.ts`.
4. Add focused tests (mock HTTP / spawn as needed).

## Contributing

Keep provider factories side-effect free beyond lazy model metadata caching. Avoid embedding UI or server logic here.
