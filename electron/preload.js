/**
 * Electron preload script — exposes safe IPC bridge to renderer.
 *
 * The renderer (Next.js app) detects Electron via window.electronAPI
 * and can call native functions through this bridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),
  startMicCapture: () => ipcRenderer.invoke("start-mic-capture"),
  stopMicCapture: () => ipcRenderer.invoke("stop-mic-capture"),
  platform: process.platform,
  isElectron: true,
});
