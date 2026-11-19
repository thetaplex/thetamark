import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import type { MenuCommand } from '../shared/api';

const MAX_RECENT = 10;
const recentFile = () => join(app.getPath('userData'), 'recent.json');

export async function loadRecent(): Promise<string[]> {
  try {
    const list: unknown = JSON.parse(await readFile(recentFile(), 'utf8'));
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export async function addRecent(recent: string[], path: string): Promise<string[]> {
  const next = [path, ...recent.filter((p) => p !== path)].slice(0, MAX_RECENT);
  app.addRecentDocument(path);
  await writeFile(recentFile(), JSON.stringify(next));
  return next;
}

export function buildMenu(
  recent: string[],
  send: (cmd: MenuCommand) => void,
  openPath: (path: string) => void,
  clearRecent: () => void,
): void {
  const item = (
    id: MenuCommand,
    label: string,
    accelerator?: string,
  ): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    click: () => send(id),
  });
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    {
      label: 'File',
      submenu: [
        item('new', 'New Tab', 'CmdOrCtrl+N'),
        item('open', 'Open…', 'CmdOrCtrl+O'),
        {
          label: 'Open Recent',
          submenu: [
            ...recent.map((p) => ({ label: p, click: () => openPath(p) })),
            { type: 'separator' },
            { label: 'Clear Recent', enabled: recent.length > 0, click: clearRecent },
          ],
        },
        { type: 'separator' },
        item('save', 'Save', 'CmdOrCtrl+S'),
        item('save-as', 'Save As…', 'Shift+CmdOrCtrl+S'),
        item('export-pdf', 'Export PDF…', 'CmdOrCtrl+P'),
        { type: 'separator' },
        item('close-tab', 'Close Tab', 'CmdOrCtrl+W'),
        ...(isMac ? [] : [{ type: 'separator' } as const, { role: 'quit' } as const]),
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        item('view-editor', 'Editor Only', 'CmdOrCtrl+1'),
        item('view-split', 'Split', 'CmdOrCtrl+2'),
        item('view-preview', 'Preview Only', 'CmdOrCtrl+3'),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
