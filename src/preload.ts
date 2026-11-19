import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from './shared/api';

const on = (channel: string) => (cb: (arg: never) => void) => {
  ipcRenderer.on(channel, (_e, arg) => cb(arg as never));
};

const api: Api = {
  openDialog: () => ipcRenderer.invoke('open-dialog'),
  read: (p) => ipcRenderer.invoke('read', p),
  write: (p, text, eol, expected) => ipcRenderer.invoke('write', p, text, eol, expected),
  saveAsDialog: (name) => ipcRenderer.invoke('save-as-dialog', name),
  stat: (p) => ipcRenderer.invoke('stat', p),
  exportPdf: (size, name) => ipcRenderer.invoke('export-pdf', size, name),
  ask: (message, detail, buttons) => ipcRenderer.invoke('ask', message, detail, buttons),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  addRecent: (p) => ipcRenderer.invoke('add-recent', p),
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
  onMenu: on('menu'),
  onOpenPath: on('open-path'),
  onCloseRequest: on('close-request'),
  onFocus: on('focus'),
};

contextBridge.exposeInMainWorld('api', api);
