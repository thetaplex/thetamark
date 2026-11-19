export type Eol = '\n' | '\r\n';
export type PageSize = 'A4' | 'Letter';
export type MenuCommand =
  | 'new'
  | 'open'
  | 'save'
  | 'save-as'
  | 'export-pdf'
  | 'close-tab'
  | 'view-editor'
  | 'view-split'
  | 'view-preview';

export type WriteResult =
  | { ok: true; mtimeMs: number }
  | { ok: false; conflict: true; mtimeMs: number };

/** Everything the sandboxed renderer may ask of the main process. */
export interface Api {
  openDialog(): Promise<string[]>;
  read(path: string): Promise<{ text: string; eol: Eol; mtimeMs: number }>;
  write(path: string, text: string, eol: Eol, expectedMtimeMs: number | null): Promise<WriteResult>;
  saveAsDialog(defaultName: string): Promise<string | null>;
  stat(path: string): Promise<number | null>;
  exportPdf(pageSize: PageSize, defaultName: string): Promise<string | null>;
  ask(message: string, detail: string, buttons: string[]): Promise<number>;
  openExternal(url: string): Promise<void>;
  addRecent(path: string): Promise<void>;
  setTitle(title: string): Promise<void>;
  confirmClose(): Promise<void>;
  onMenu(cb: (cmd: MenuCommand) => void): void;
  onOpenPath(cb: (path: string) => void): void;
  onCloseRequest(cb: () => void): void;
  onFocus(cb: () => void): void;
}
