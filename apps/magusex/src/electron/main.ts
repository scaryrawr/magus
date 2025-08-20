import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const isDev = process.env.DEV != undefined;
const isPreview = process.env.PREVIEW != undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MagusServerHandle = {
  url: URL;
  stop: () => void;
};

let magusServer: MagusServerHandle | null = null;

async function ensureMagusServer(): Promise<MagusServerHandle> {
  if (magusServer) return magusServer;

  // Dynamic import to interop with ESM-only packages from CommonJS output.
  // Using Function constructor preserves native import() at runtime so TS doesn't downlevel to require().
  type ServerModule = typeof import("@magus/server");
  type ProvidersModule = typeof import("@magus/providers");

  const dynamicImportFn = new Function("s", "return import(s)") as (s: string) => Promise<unknown>;
  const dynamicImport = <T>(s: string) => dynamicImportFn(s) as Promise<T>;

  const [{ createServer }, { createLmStudioProvider, createOllamaProvider }] = await Promise.all([
    dynamicImport<ServerModule>("@magus/server"),
    dynamicImport<ProvidersModule>("@magus/providers"),
  ]);

  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const service = createServer({
    providers,
    // Default to LM Studio OSS model; users can change later via settings
    model: providers[0].model("openai/gpt-oss-20b"),
  });

  const server = service.listen();
  magusServer = server;
  return server;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else if (isPreview) {
    mainWindow.webContents.openDevTools();
    mainWindow.loadFile(join(__dirname, "..", ".next/server/pages/index.html"));
  } else {
    mainWindow.loadFile(join(__dirname, "..", ".next/server/pages/index.html"));
  }
}

app.whenReady().then(() => {
  // Lazily start the Magus server when renderer asks, but also kick it off in the background
  // so the first call is fast.
  void ensureMagusServer();

  // IPC to fetch server info from renderer
  ipcMain.handle("magus:getServerInfo", async () => {
    const server = await ensureMagusServer();
    return { url: server.url.toString() };
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  try {
    magusServer?.stop();
  } catch {
    // ignore errors on shutdown
  }
});
