/**
 * Electron IPC bridge for the renderer process.
 *
 * Detects if running inside Electron via the preload-exposed
 * window.electronAPI object. The live-recorder component uses
 * this to route audio through native capture when available.
 */

interface ElectronAPI {
  ping: () => Promise<string>;
  startMicCapture: () => Promise<{ status: string; message?: string }>;
  stopMicCapture: () => Promise<{ status: string }>;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.electronAPI?.isElectron;
}

export function getElectronAPI(): ElectronAPI | null {
  if (!isElectron()) return null;
  return window.electronAPI!;
}
