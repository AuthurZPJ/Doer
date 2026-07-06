const { app, BrowserWindow, Menu, dialog, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;
let logStream = null;

function getLogStream() {
  if (logStream) return logStream;
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logStream = fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
  return logStream;
}

function logServerLine(level, data) {
  const line = `[server] ${data.toString().trim()}`;
  if (process.env.DOER_DEV) {
    if (level === 'error') console.error(line);
    else console.log(line);
    return;
  }
  try { getLogStream().write(`${new Date().toISOString()} ${line}\n`); } catch {}
}

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

  serverProcess.stdout.on('data', (data) => logServerLine('info', data));
  serverProcess.stderr.on('data', (data) => logServerLine('error', data));
  serverProcess.on('error', (err) => logServerLine('error', `fork error: ${err.message}`));
  serverProcess.on('exit', () => { serverProcess = null; });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) { resolve(); return; }
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    serverProcess.on('exit', done);
    // Prefer IPC graceful shutdown (cross-platform); Windows maps SIGTERM to TerminateProcess.
    try { serverProcess.send('shutdown'); } catch {}
    setTimeout(() => {
      if (serverProcess) { try { serverProcess.kill(); } catch {} }
      setTimeout(done, 1000);
    }, 5000);
  });
}

function waitForServer(callback, retries = 30, delay = 150) {
  const req = http.get('http://localhost:3001/api/health', (res) => {
    res.resume();
    if (res.statusCode === 200) { callback(true); return; }
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1, Math.min(delay * 1.5, 800)), delay);
    else callback(false);
  });
  req.on('error', () => {
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1, Math.min(delay * 1.5, 800)), delay);
    else callback(false);
  });
  req.setTimeout(2000, () => {
    req.destroy();
    if (retries > 0) setTimeout(() => waitForServer(callback, retries - 1, Math.min(delay * 1.5, 800)), delay);
    else callback(false);
  });
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
      if (logStream) { try { logStream.end(); } catch {} }
      app.quit();
    }
  });
}
