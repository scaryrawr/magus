// main.ts
export {
  buildDefaultConfigs,
  commandExists,
  createDefaultLspManager,
  defaultServerDefinitions,
  type BuildDefaultsOptions,
} from "./defaults";
export { DiagnosticsStore, type FileDiagnostics } from "./diagnostics";
export { detectLanguage } from "./languages";
export { LspManager, type LspConfig } from "./lspManager";
export { detectProjectLanguages } from "./projectLanguages";
