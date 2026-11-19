import { statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';
import started from 'electron-squirrel-startup';
import { readDoc, statMtime, writeDoc } from './main/files';
import { addRecent, buildMenu, loadRecent } from './main/menu';
import type { Eol, MenuCommand, PageSize } from './shared/api';

if (started) app.quit();

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
protocol.registerSchemesAsPrivileged([
  { scheme: 'thetamark-file', privileges: { supportFetchAPI: true, stream: true } },
]);

let win: BrowserWindow | null = null;
let ready = false; // renderer loaded and listening
let quitting = false;
let allowClose = false;
let quitAfterClose = false;
let recent: string[] = [];
const pending: string[] = [];

const isFile = (p: string) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

function openPath(p: string) {
  if (!win) createWindow();
  if (ready && win) {
    win.webContents.send('open-path', p);
    if (win.isMinimized()) win.restore();
    win.focus();
  } else pending.push(p);
}

const filesFromArgv = (argv: string[]) =>
  argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((a) => !a.startsWith('-') && isFile(a))
    .map((a) => path.resolve(a));

function refreshMenu() {
  buildMenu(
    recent,
    (cmd: MenuCommand) => win?.webContents.send('menu', cmd),
    openPath,
    async () => {
      recent = [];
      app.clearRecentDocuments();
      await writeFile(path.join(app.getPath('userData'), 'recent.json'), '[]');
      refreshMenu();
    },
  );
}

function createWindow() {
  ready = false;
  allowClose = false;
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'thetamark',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  const wc = win.webContents;
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', (e) => e.preventDefault());
  wc.on('did-finish-load', () => {
    ready = true;
    for (const p of pending.splice(0)) wc.send('open-path', p);
  });
  // A dead renderer can't answer close-request; don't trap the user.
  wc.on('render-process-gone', () => {
    allowClose = true;
  });
  win.on('focus', () => ready && wc.send('focus'));
  win.on('close', (e) => {
    if (allowClose) return;
    e.preventDefault();
    quitAfterClose = quitting;
    quitting = false;
    wc.send('close-request');
  });
  win.on('closed', () => {
    win = null;
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

// --- IPC: every argument from the renderer is checked before use. ---
const str = (v: unknown): string => {
  if (typeof v !== 'string') throw new TypeError('expected string');
  return v;
};
const owner = (e: Electron.IpcMainInvokeEvent) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) throw new Error('no window for sender');
  return w;
};
const mdFilters = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt'] },
  { name: 'All Files', extensions: ['*'] },
];

ipcMain.handle('open-dialog', async (e) => {
  const r = await dialog.showOpenDialog(owner(e), {
    properties: ['openFile', 'multiSelections'],
    filters: mdFilters,
  });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('read', (_e, p) => readDoc(str(p)));
ipcMain.handle('write', (_e, p, text, eol, expected) => {
  const e: Eol = eol === '\r\n' ? '\r\n' : '\n';
  return writeDoc(str(p), str(text), e, typeof expected === 'number' ? expected : null);
});
ipcMain.handle('stat', (_e, p) => statMtime(str(p)));
ipcMain.handle('save-as-dialog', async (e, name) => {
  const r = await dialog.showSaveDialog(owner(e), { defaultPath: str(name), filters: mdFilters });
  return r.canceled || !r.filePath ? null : r.filePath;
});
ipcMain.handle('export-pdf', async (e, size, name) => {
  const pageSize: PageSize = size === 'Letter' ? 'Letter' : 'A4';
  const r = await dialog.showSaveDialog(owner(e), {
    defaultPath: str(name),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (r.canceled || !r.filePath) return null;
  const pdf = await e.sender.printToPDF({ pageSize, printBackground: true });
  await writeFile(r.filePath, pdf);
  return r.filePath;
});
ipcMain.handle('ask', async (e, message, detail, buttons) => {
  const labels = Array.isArray(buttons) ? buttons.map(str) : ['OK'];
  const r = await dialog.showMessageBox(owner(e), {
    type: 'question',
    message: str(message),
    detail: str(detail),
    buttons: labels,
    defaultId: 0,
    cancelId: labels.length - 1,
    noLink: true,
  });
  return r.response;
});
ipcMain.handle('open-external', (_e, url) => {
  const u = new URL(str(url));
  if (['http:', 'https:', 'mailto:'].includes(u.protocol)) return shell.openExternal(u.href);
});
ipcMain.handle('add-recent', async (_e, p) => {
  recent = await addRecent(recent, str(p));
  refreshMenu();
});
ipcMain.handle('set-title', (e, t) => owner(e).setTitle(str(t)));
ipcMain.handle('confirm-close', (e) => {
  allowClose = true;
  if (quitAfterClose) app.quit();
  else owner(e).close();
});

// --- App lifecycle ---
if (!app.requestSingleInstanceLock()) app.quit();
else {
  pending.push(...filesFromArgv(process.argv));
  app.on('second-instance', (_e, argv) => {
    for (const p of filesFromArgv(argv)) openPath(p);
    if (win) win.focus();
  });
  app.on('open-file', (e, p) => {
    e.preventDefault();
    if (app.isReady()) openPath(p);
    else pending.push(p);
  });
  app.on('before-quit', () => {
    quitting = true;
  });
  app.whenReady().then(async () => {
    protocol.handle('thetamark-file', (req) => {
      const p = new URL(req.url).pathname;
      if (!IMAGE_EXT.test(p)) return new Response('Not an image', { status: 403 });
      return net.fetch(`file://${p}`);
    });
    recent = await loadRecent();
    refreshMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
