// Expose safe APIs to the renderer via contextBridge
import { contextBridge, ipcRenderer } from "electron";

type ServerInfo = {
  url: string;
};

const api = {
  getServerInfo: async (): Promise<ServerInfo> => {
    return ipcRenderer.invoke("magus:getServerInfo");
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
