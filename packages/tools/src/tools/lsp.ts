import { type FileDiagnostics, LspManager } from "@magus/lsp";
import { tool, type ToolSet } from "ai";
import { URI } from "vscode-uri";
import { z } from "zod";

// Input: list of file paths (relative or absolute) or URIs.
export const LspDiagnosticsInputSchema = z.object({
  files: z
    .array(z.string())
    .min(1, "Provide at least one file path or file:// URI")
    .describe("List of file paths (relative or absolute) or file:// URIs to retrieve diagnostics for."),
  include_empty: z
    .boolean()
    .optional()
    .describe("If true include entries for files that currently have no diagnostics."),
});

export type LspDiagnosticsInput = z.infer<typeof LspDiagnosticsInputSchema>;

// Shape of individual diagnostic (subset of LSP Diagnostic enriched with client id + path)
const PositionSchema = z.object({ line: z.number(), character: z.number() });
const RangeSchema = z.object({ start: PositionSchema, end: PositionSchema });
const DiagnosticSchema = z.object({
  message: z.string(),
  severity: z.number().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  source: z.string().optional(),
  range: RangeSchema,
  client_id: z.string().describe("ID of the LSP client that produced this diagnostic"),
  uri: z.string().describe("File URI the diagnostic applies to"),
});

export const LspDiagnosticsOutputSchema = z.object({
  diagnostics: z
    .array(DiagnosticSchema)
    .describe("Flattened list of diagnostics across all requested files and LSP clients."),
});
export type LspDiagnosticsOutput = z.infer<typeof LspDiagnosticsOutputSchema>;

/** Normalize an input path or URI to a file:// URI string */
import path from "node:path";

const toUri = (root: string, fileOrUri: string) => {
  if (fileOrUri.startsWith("file://")) return fileOrUri;
  const abs = path.isAbsolute(fileOrUri) ? fileOrUri : path.join(root, fileOrUri);
  return URI.file(abs).toString();
};

export const collectDiagnostics = (
  manager: LspManager,
  rootDir: string,
  input: LspDiagnosticsInput,
): LspDiagnosticsOutput => {
  const out: LspDiagnosticsOutput["diagnostics"] = [];
  for (const f of input.files) {
    const uri = toUri(rootDir, f);
    const fd: FileDiagnostics | undefined = manager.getDiagnostics(uri);
    if (!fd) continue; // include_empty yields no explicit placeholder entries
    for (const [clientId, list] of Object.entries(fd.byClient)) {
      for (const diag of list) {
        out.push({
          message: diag.message,
          severity: diag.severity,
          code: typeof diag.code === "string" || typeof diag.code === "number" ? diag.code : undefined,
          source: diag.source,
          range: diag.range,
          client_id: clientId,
          uri: fd.uri,
        });
      }
    }
  }
  return { diagnostics: out };
};

/** Factory creating the diagnostics tool. Requires a shared LspManager instance (do not create per call). */
export const createLspDiagnosticsTool = (manager: LspManager, rootDir: string = process.cwd()) => {
  return {
    lsp_diagnostics: tool({
      description:
        "Retrieve language server diagnostics for one or more files. Use this to understand compile / lint issues, errors, and warnings produced by configured LSP servers.",
      inputSchema: LspDiagnosticsInputSchema,
      outputSchema: LspDiagnosticsOutputSchema,
      execute: (input): LspDiagnosticsOutput => collectDiagnostics(manager, rootDir, input),
    }),
  } satisfies ToolSet;
};

export type LspDiagnosticsToolSet = ReturnType<typeof createLspDiagnosticsTool>;
