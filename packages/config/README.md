# @magus/config

User-level configuration, cache, and data file helpers with validated schemas. Centralizes file locations and serialization to keep persistence concerns out of feature packages.

## Schemas

- `MagusConfigSchema` – User settings (feature flags, preferences) (currently minimal placeholder)
- `MagusCacheSchema` – Ephemeral cache data (e.g. last model selection)
- `MagusDataSchema` – Durable data (history, future persisted artifacts)

All defined with Zod for strict validation.

## File Locations

Resolved via `env-paths("magus")`:

- Config: `config/config.json`
- Cache: `cache/cache.json`
- Data: `data/data.json`

Helper exports (`configFile`, `cacheFile`, `dataFile`) provide absolute paths.

## Usage

```ts
import { getConfig, setConfig, MagusConfigSchema } from "@magus/config";

const current = await getConfig();
await setConfig({ ...(current ?? {}), theme: "dark" } as any);
```

## Install

```bash
bun install
```

## Testing

```bash
bun test --filter @magus/config
```

## Contributing

Extend schemas cautiously; any breaking changes should include migration or defensive parsing logic.
