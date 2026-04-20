/**
 * Tauri IPC bridge for JS.
 * Lazy-loads @tauri-apps/api only when running inside Tauri.
 */

/**
 * Detect if the app is running inside a Tauri shell.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TauriBridge = Record<string, any>;

/**
 * Lazy-load the Tauri bridge (invoke, event, etc.).
 * Returns null when not running in Tauri.
 */
export async function loadTauriBridge(): Promise<TauriBridge | null> {
  if (!isTauri()) return null;

  try {
    // Dynamic import avoids bundling @tauri-apps/api when not installed.
    // The package is only present in Tauri desktop builds.
    const moduleName = "@tauri-apps/api";
    const tauri: TauriBridge = await import(/* webpackIgnore: true */ moduleName);
    return tauri;
  } catch {
    console.warn("[tauri] Failed to load @tauri-apps/api");
    return null;
  }
}
