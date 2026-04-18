import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
    // iOS doesn't support setBackgroundColor - the overlay + CSS handles it
  } catch {
    // Not on a native platform or plugin not available
  }
}
