import { mkdtemp, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from '@playwright/test';

// Runs against the built app in .vite/ (`just e2e` builds it first).
let app: ElectronApplication;
let page: Page;
let dir: string;
let doc: string;

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

const menu = (id: string) =>
  app.evaluate(({ Menu }, id) => Menu.getApplicationMenu()?.getMenuItemById(id)?.click(), id);

/** Stub native dialogs in the main process; message boxes answer `response` and are recorded. */
const stubDialogs = (savePath: string, response: number) =>
  app.evaluate(
    ({ dialog }, { savePath, response }) => {
      const g = globalThis as unknown as { asked: string[] };
      g.asked = [];
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath: savePath })) as never;
      dialog.showMessageBox = (async (_w: unknown, o: { message: string }) => {
        g.asked.push(o.message);
        return { response, checkboxChecked: false };
      }) as never;
    },
    { savePath, response },
  );
const asked = () => app.evaluate(() => (globalThis as unknown as { asked: string[] }).asked);

test.beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'thetamark-e2e-'));
  doc = join(dir, 'notes.md');
  await writeFile(doc, '# Notes\r\n\r\n| a | b |\r\n|---|---|\r\n| 1 | 2 |\r\n');
  app = await electron.launch({ args: ['.', `--user-data-dir=${join(dir, 'profile')}`, doc] });
  page = await app.firstWindow();
  await expect(page.locator('#preview h1')).toHaveText('Notes');
});

test.afterEach(async () => {
  await app.evaluate(({ app }) => app.exit(0));
});

async function typeAtEnd(text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press(`${mod}+End`);
  await page.keyboard.type(text);
}

test('opens, renders GFM, edits and saves with CRLF preserved', async () => {
  await expect(page.locator('#preview table')).toBeVisible();
  await typeAtEnd('\nmore');
  await expect(page.locator('.tab[aria-selected="true"]')).toContainText('● notes.md');
  await menu('save');
  await expect.poll(() => readFile(doc, 'utf8')).toContain('| 1 | 2 |\r\n\r\nmore');
  expect(await readFile(doc, 'utf8')).not.toMatch(/[^\r]\n/);
  await expect(page.locator('.tab[aria-selected="true"]')).not.toContainText('●');
});

test('flavor switch changes rendering; extended renders math and mermaid', async () => {
  await page.selectOption('#flavor', 'commonmark');
  await expect(page.locator('#preview table')).toHaveCount(0);
  await page.selectOption('#flavor', 'extended');
  await typeAtEnd('\n\n$x^2$\n\n```mermaid\ngraph TD; A-->B\n');
  await expect(page.locator('#preview .katex')).toBeVisible();
  await expect(page.locator('#preview .mermaid svg')).toBeVisible();
});

test('exports a PDF', async () => {
  const pdf = join(dir, 'notes.pdf');
  await stubDialogs(pdf, 0);
  await menu('export-pdf');
  await expect
    .poll(async () => (await readFile(pdf).catch(() => Buffer.alloc(0))).subarray(0, 4).toString())
    .toBe('%PDF');
});

test('closing a dirty tab prompts and Cancel keeps it', async () => {
  await stubDialogs(join(dir, 'unused.md'), 2);
  await typeAtEnd('x');
  await menu('close-tab');
  await expect.poll(asked).toEqual(['Save changes to notes.md?']);
  await expect(page.locator('.tab')).toHaveCount(1);
  await expect(page.locator('.tab')).toContainText('● notes.md');
});

test('save after an external change asks, Overwrite writes ours', async () => {
  await stubDialogs(join(dir, 'unused.md'), 0);
  await writeFile(doc, 'other program\n');
  const later = new Date((await stat(doc)).mtimeMs + 5000);
  await utimes(doc, later, later);
  await typeAtEnd('\nmine');
  await menu('save');
  await expect.poll(asked).toEqual(['notes.md was changed by another program.']);
  await expect.poll(() => readFile(doc, 'utf8')).toContain('mine');
});

test('new tab, then opening an already-open file focuses its tab', async () => {
  await menu('new');
  await expect(page.locator('.tab')).toHaveCount(2);
  await app.evaluate(({ dialog }, doc) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [doc] })) as never;
  }, doc);
  await menu('open');
  await expect(page.locator('.tab')).toHaveCount(2);
  await expect(page.locator('.tab[aria-selected="true"]')).toContainText('notes.md');
});

test('closing the window with unsaved edits prompts; Cancel keeps it open', async () => {
  await stubDialogs(join(dir, 'unused.md'), 2);
  await typeAtEnd('x');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await expect.poll(asked).toEqual(['Save changes to notes.md?']);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
});

test('relative images load from the file directory without CSP errors', async () => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await writeFile(join(dir, 'dot.png'), png);
  await typeAtEnd('\n![dot](dot.png)\n');
  const img = page.locator('#preview img');
  await expect(img).toHaveAttribute('src', /^thetamark-file:/);
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1);
  expect(errors).toEqual([]);
});
