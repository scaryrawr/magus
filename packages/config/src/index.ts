export { MagusCacheSchema } from "./cacheSchema";
export type { MagusCache } from "./cacheSchema";

export { MagusConfigSchema } from "./configSchema";
export type { MagusConfig } from "./configSchema";
export { MagusDataSchema } from "./dataSchema";
export type { MagusData } from "./dataSchema";
export {
  cacheFile,
  configFile,
  dataFile,
  getCache,
  getConfig,
  getData,
  setCache,
  setConfig,
  setData,
} from "./magusConfig";
