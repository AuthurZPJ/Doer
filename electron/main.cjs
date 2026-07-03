const { app, BrowserWindow, Menu } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;

function startServer() {
  const isDev = !!process.env.DOER_DEV;
  if (isDev) return;

  const serverDir = path.join(__dirname, '..', 'server');
  const entryFile = path.join(serverDir, 'dist', 'index.js');

  serverProcess = fork(entryFile, [], {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1' },
    execPath: process.execPath,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  serverProcess.stdout.on('data', (data) => console.log(`[server] ${data.toString().trim()}`));
  serverProcess.stderr.on('data', (data) => console.error(`[server] ${data.toString().trim()}`));
  serverProcess.on('error', (err) => console.error(`[server] fork error: ${err.message}`));
}

function waitForServer(callback, retries = 30) {
  const req = http.get('http://localhost:3001/api/health', (res) => {
    if (res.statusCode === 200) { callback(); return; }
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500);
    else callback();
  });
  req.on('error', () => {
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500);
    else callback();
  });
  req.setTimeout(2000, () => { req.destroy(); if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500); else callback(); });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Doer',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged || !process.env.DOER_DEV) {
    mainWindow.loadFile(path.join(__dirname, '..', 'client/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  const isDev = !!process.env.DOER_DEV;
  if (isDev) {
    createWindow();
  } else {
    startServer();
    waitForServer(() => createWindow());
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
