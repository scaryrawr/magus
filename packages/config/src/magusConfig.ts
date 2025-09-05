import envPaths from "env-paths";
import { promises as fs } from "fs";
import path from "path";
import { type ZodSchema } from "zod";
import { MagusCacheSchema, type MagusCache } from "./cacheSchema";
import { MagusConfigSchema, type MagusConfig } from "./configSchema";
import { MagusDataSchema, type MagusData } from "./dataSchema";

// Helper to ensure a directory exists
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore if exists
  }
}

// Generic read/write with validation
async function readJson<T>(filePath: string, schema: ZodSchema<T>): Promise<T | undefined> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(data);
    return schema.parse(parsed);
  } catch {
    // If file doesn't exist or parse fails, return undefined
    return undefined;
  }
}

async function writeJson<T>(filePath: string, data: T) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

// Paths based on env-paths
const paths = envPaths("magus");

export const cacheFile = path.join(paths.cache, "cache.json");
export const configFile = path.join(paths.config, "config.json");
export const dataFile = path.join(paths.data, "data.json");

// Cache operations
export async function getCache(): Promise<MagusCache | undefined> {
  return await readJson(cacheFile, MagusCacheSchema);
}

export async function setCache(cache: MagusCache): Promise<void> {
  await writeJson(cacheFile, cache);
}

// Config operations (placeholder schema)
export async function getConfig(): Promise<MagusConfig | undefined> {
  return await readJson(configFile, MagusConfigSchema);
}

export async function setConfig(config: MagusConfig): Promise<void> {
  await writeJson(configFile, config);
}

// Data operations (placeholder schema)
export async function getData(): Promise<MagusData | undefined> {
  return await readJson(dataFile, MagusDataSchema);
}

export async function setData(data: MagusData): Promise<void> {
  await writeJson(dataFile, data);
}
