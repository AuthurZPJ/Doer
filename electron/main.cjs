const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let serverProcess = null;

function startServer() {
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, 'server');

  serverProcess = spawn('node', ['src/index.ts'], {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data) => console.log(`[server] ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`[server] ${data}`));
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

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  if (!app.isPackaged) {
    createWindow();
  } else {
    startServer();
    setTimeout(() => createWindow(), 2000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
