/**
 * Electron main process — Layers desktop shell.
 *
 * Strategy: loads the live Vercel deployment in production, localhost
 * in dev. Same pattern as the Capacitor shell — single codebase serves
 * web + desktop + mobile.
 *
 * Window: frameless with custom traffic-light positioning on macOS,
 * dark background (#0a0a0a) to prevent white flash on launch.
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const DEV_URL = "http://localhost:3000";
const PROD_URL = "https://audio-layer.vercel.app";
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 480,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = isDev ? DEV_URL : PROD_URL;
  mainWindow.loadURL(url);

  // Prevent white flash — show after content loads
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers for native audio capture
ipcMain.handle("ping", () => "pong");

// Mic capture placeholder — will use node-audiorecorder or portaudio
ipcMain.handle("start-mic-capture", async () => {
  // TODO: implement native mic capture via node bindings
  return { status: "not-implemented", message: "Use browser getUserMedia for now" };
});

ipcMain.handle("stop-mic-capture", async () => {
  return { status: "ok" };
});
