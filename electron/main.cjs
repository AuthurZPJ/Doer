const { app, BrowserWindow, Menu, dialog, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

function startServer() {
  if (serverProcess) return;
  if (process.env.DOER_DEV) return;

  const serverDir = path.join(__dirname, '..', 'server');
  const entryFile = path.join(serverDir, 'dist', 'index.js');

  serverProcess = fork(entryFile, [], {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1', DOER_DB_DIR: app.getPath('userData') },
    execPath: process.execPath,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    windowsHide: true,
  });

  serverProcess.stdout.on('data', (data) => console.log(`[server] ${data.toString().trim()}`));
  serverProcess.stderr.on('data', (data) => console.error(`[server] ${data.toString().trim()}`));
  serverProcess.on('error', (err) => console.error(`[server] fork error: ${err.message}`));
  serverProcess.on('exit', () => { serverProcess = null; });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) { resolve(); return; }
    serverProcess.on('exit', () => resolve());
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      if (serverProcess) {
        try { serverProcess.kill('SIGKILL'); } catch {}
      }
      resolve();
    }, 5000);
  });
}

function waitForServer(callback, retries = 30) {
  const req = http.get('http://localhost:3001/api/health', (res) => {
    if (res.statusCode === 200) { callback(true); return; }
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500);
    else callback(false);
  });
  req.on('error', () => {
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500);
    else callback(false);
  });
  req.setTimeout(2000, () => { req.destroy(); if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1), 500); else callback(false); });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Doer',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (!process.env.DOER_DEV) {
    mainWindow.loadFile(path.join(__dirname, '..', 'client/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  Menu.setApplicationMenu(null);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self'; connect-src 'self' http://localhost:3001; style-src 'self' 'unsafe-inline'; img-src 'self' data:"],
        },
      });
    });

    if (process.env.DOER_DEV) {
      createWindow();
    } else {
      startServer();
      waitForServer((ok) => {
        if (ok) {
          createWindow();
        } else {
          dialog.showErrorBox('Doer', 'The backend server failed to start. The application will now quit.');
          app.quit();
        }
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        if (!process.env.DOER_DEV && !serverProcess) {
          startServer();
          waitForServer((ok) => {
            if (ok) createWindow();
            else {
              dialog.showErrorBox('Doer', 'The backend server failed to start. The application will now quit.');
              app.quit();
            }
          });
        } else {
          createWindow();
        }
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', async (event) => {
    if (!isQuitting) {
      isQuitting = true;
      event.preventDefault();
      await stopServer();
      app.quit();
    }
  });
}
