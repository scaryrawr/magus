// Expose safe APIs to the renderer via contextBridge if needed
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // add bridged methods here later
});
