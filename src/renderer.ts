import 'katex/dist/katex.min.css';
import './renderer/styles.css';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { FLAVORS, type Flavor, renderMarkdown } from './renderer/render';
import { nextActiveAfterClose, planOpen, type Tab, title } from './renderer/tabs';
import type { Api, MenuCommand, PageSize } from './shared/api';

const api = (window as unknown as { api: Api }).api;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const tabsEl = $<HTMLElement>('#tabs');
const preview = $<HTMLElement>('#preview');
const flavorSel = $<HTMLSelectElement>('#flavor');
const pageSel = $<HTMLSelectElement>('#page-size');

// --- per-viewer preferences (localStorage may be unavailable) ---
const pref = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
const lastFlavor = (): Flavor => {
  const f = pref.get('flavor');
  return FLAVORS.includes(f as Flavor) ? (f as Flavor) : 'gfm';
};
pageSel.value = pref.get('pageSize') === 'Letter' ? 'Letter' : 'A4';
pageSel.onchange = () => pref.set('pageSize', pageSel.value);

// --- tabs ---
type DocTab = Tab<EditorState> & { flavor: Flavor; ignoredMtime: number | null };
let tabs: DocTab[] = [];
let activeId = 0;
let nextId = 1;
const active = () => tabs.find((t) => t.id === activeId) as DocTab;
const text = (t: DocTab) => (t.id === activeId ? view.state : t.state).doc.toString();
const isDirty = (t: DocTab) => text(t) !== t.savedText;
const dirname = (p: string) => p.replace(/[\\/][^\\/]*$/, '') || '/';

// --- editor ---
const dark = matchMedia('(prefers-color-scheme: dark)');
const theme = new Compartment();
// Colours come from the CSS palette (styles.css); only token colours differ by mode.
const palette = EditorView.theme({
  '&': { backgroundColor: 'var(--surface)', color: 'var(--fg)' },
  '.cm-content': { caretColor: 'var(--accent)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--muted)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--active-line)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    { backgroundColor: 'var(--selection)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--selection)' },
});
const themeFor = () => [
  palette,
  syntaxHighlighting(dark.matches ? oneDarkHighlightStyle : defaultHighlightStyle),
];
let lastDirty = false;
const extensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter(),
  history(),
  drawSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  EditorView.lineWrapping,
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  theme.of(themeFor()),
  keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
  EditorView.updateListener.of((u) => {
    if (!u.docChanged) return;
    scheduleRender();
    const d = isDirty(active());
    if (d !== lastDirty) refreshChrome();
  }),
];
const newState = (doc: string) => EditorState.create({ doc, extensions });
const view = new EditorView({ parent: $<HTMLElement>('#editor'), state: newState('') });
dark.addEventListener('change', () => {
  view.dispatch({ effects: theme.reconfigure(themeFor()) });
  for (const t of tabs) if (t.id !== activeId) t.state = newState(t.state.doc.toString());
  mermaidCache.clear();
  void renderNow();
});

function activate(id: number) {
  const cur = tabs.find((t) => t.id === activeId);
  if (cur) cur.state = view.state;
  activeId = id;
  view.setState(active().state);
  flavorSel.value = active().flavor;
  refreshChrome();
  void renderNow();
  view.focus();
}

function addTab(fields: Partial<DocTab> & { savedText: string }): DocTab {
  const t: DocTab = {
    id: nextId++,
    path: null,
    eol: '\n',
    mtimeMs: null,
    flavor: lastFlavor(),
    ignoredMtime: null,
    state: newState(fields.savedText),
    ...fields,
  };
  tabs.push(t);
  return t;
}

function refreshChrome() {
  const a = active();
  lastDirty = isDirty(a);
  // The window follows document.title; it is also the exported PDF's Title.
  document.title = `${lastDirty ? '• ' : ''}${title(a)}`;
  tabsEl.replaceChildren(
    ...tabs.map((t) => {
      const b = document.createElement('div');
      b.className = 'tab';
      b.role = 'tab';
      b.tabIndex = 0;
      b.ariaSelected = String(t.id === activeId);
      b.title = t.path ?? 'Untitled';
      const label = document.createElement('span');
      label.textContent = `${isDirty(t) ? '● ' : ''}${title(t)}`;
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'close';
      x.textContent = '×';
      x.ariaLabel = `Close ${title(t)}`;
      x.onclick = (e) => {
        e.stopPropagation();
        void closeTab(t.id);
      };
      b.append(label, x);
      b.onclick = () => t.id !== activeId && activate(t.id);
      b.onauxclick = (e) => e.button === 1 && void closeTab(t.id);
      b.onkeydown = (e) => e.key === 'Enter' && activate(t.id);
      return b;
    }),
  );
}

// --- preview ---
let renderTimer: ReturnType<typeof setTimeout> | undefined;
let renderSeq = 0;
const mermaidCache = new Map<string, string>();
const scheduleRender = () => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderNow, 150);
};

async function renderNow() {
  clearTimeout(renderTimer);
  const seq = ++renderSeq;
  const t = active();
  const html = await renderMarkdown(view.state.doc.toString(), t.flavor, t.path && dirname(t.path));
  if (seq !== renderSeq) return;
  preview.innerHTML = html;
  const blocks = [...preview.querySelectorAll('pre > code.language-mermaid')];
  if (t.flavor !== 'extended' || blocks.length === 0) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      primaryColor: '#faf7f1',
      primaryBorderColor: '#cd8e33',
      primaryTextColor: '#1a1612',
      lineColor: '#7a6e5c',
      secondaryColor: '#eee8de',
      tertiaryColor: '#ffffff',
    },
  });
  for (const code of blocks) {
    const src = code.textContent ?? '';
    let svg = mermaidCache.get(src);
    if (!svg) {
      const id = `mermaid-${seq}-${blocks.indexOf(code)}`;
      try {
        svg = (await mermaid.render(id, src)).svg;
        mermaidCache.set(src, svg);
      } catch (err) {
        document.getElementById(`d${id}`)?.remove();
        code.parentElement?.classList.add('mermaid-error');
        code.parentElement?.setAttribute('data-error', String((err as Error).message ?? err));
        continue;
      }
    }
    if (seq !== renderSeq) return;
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.innerHTML = svg;
    code.parentElement?.replaceWith(div);
  }
}

preview.addEventListener('click', (e) => {
  const a = (e.target as Element).closest('a');
  if (!a) return;
  e.preventDefault();
  const href = a.getAttribute('href') ?? '';
  if (href.startsWith('#')) {
    const id = decodeURIComponent(href.slice(1));
    (
      document.getElementById(id) ?? document.getElementById(`user-content-${id}`)
    )?.scrollIntoView();
  } else if (/^(https?|mailto):/i.test(a.href)) void api.openExternal(a.href);
});

flavorSel.onchange = () => {
  active().flavor = flavorSel.value as Flavor;
  pref.set('flavor', flavorSel.value);
  void renderNow();
};

// --- file commands ---
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function openPath(path: string) {
  const plan = planOpen(tabs, activeId, path, (t) => !isDirty(t) && text(t) === '');
  if (plan.kind === 'focus') return activate(plan.id);
  let doc: Awaited<ReturnType<Api['read']>>;
  try {
    doc = await api.read(path);
  } catch (e) {
    await api.ask(`Couldn't open ${path}`, errText(e), ['OK']);
    return;
  }
  const fields = { path, eol: doc.eol, mtimeMs: doc.mtimeMs, savedText: doc.text };
  if (plan.kind === 'reuse') {
    Object.assign(active(), fields, { state: newState(doc.text), ignoredMtime: null });
    view.setState(active().state);
    activate(plan.id);
  } else activate(addTab(fields).id);
  void api.addRecent(path);
}

async function reload(t: DocTab) {
  if (!t.path) return;
  const doc = await api.read(t.path);
  Object.assign(t, { eol: doc.eol, mtimeMs: doc.mtimeMs, savedText: doc.text, ignoredMtime: null });
  t.state = newState(doc.text);
  if (t.id === activeId) {
    view.setState(t.state);
    void renderNow();
  }
  refreshChrome();
}

async function writeTo(t: DocTab, path: string, expected: number | null): Promise<boolean> {
  const body = text(t);
  try {
    let r = await api.write(path, body, t.eol, expected);
    if (!r.ok) {
      const choice = await api.ask(
        `${title(t)} was changed by another program.`,
        'Overwrite it with your version, reload the version on disk (losing your edits), or cancel?',
        ['Overwrite', 'Reload', 'Cancel'],
      );
      if (choice === 1) await reload(t);
      if (choice !== 0) return false;
      r = await api.write(path, body, t.eol, null);
    }
    if (r.ok) Object.assign(t, { path, savedText: body, mtimeMs: r.mtimeMs, ignoredMtime: null });
  } catch (e) {
    await api.ask(`Couldn't save ${title(t)}`, errText(e), ['OK']);
    return false;
  }
  refreshChrome();
  void renderNow();
  return true;
}

async function save(t: DocTab): Promise<boolean> {
  return t.path ? writeTo(t, t.path, t.mtimeMs) : saveAs(t);
}

async function saveAs(t: DocTab): Promise<boolean> {
  const p = await api.saveAsDialog(t.path ?? `${title(t)}.md`);
  if (!p) return false;
  const ok = await writeTo(t, p, null);
  if (ok) void api.addRecent(p);
  return ok;
}

async function exportPdf() {
  const t = active();
  if (t.path) {
    const m = await api.stat(t.path);
    if (m !== null && m !== t.mtimeMs) {
      const choice = await api.ask(
        `${title(t)} was changed by another program.`,
        'Reload the version on disk before exporting, or export the text you see now?',
        ['Reload first', 'Export current text', 'Cancel'],
      );
      if (choice === 2) return;
      if (choice === 0) {
        if (isDirty(t)) {
          const sure = await api.ask('Reload and lose your unsaved edits?', '', [
            'Reload',
            'Cancel',
          ]);
          if (sure !== 0) return;
        }
        await reload(t);
      } else t.ignoredMtime = m;
    }
  }
  await renderNow();
  // Default to <document folder>/<document name>.pdf.
  const name = `${title(t).replace(/\.[^.]+$/, '')}.pdf`;
  document.title = title(t);
  try {
    await api.exportPdf(
      pageSel.value as PageSize,
      t.path ? t.path.slice(0, -title(t).length) + name : name,
    );
  } catch (e) {
    await api.ask("Couldn't export PDF", errText(e), ['OK']);
  } finally {
    refreshChrome();
  }
}

/** Ask about unsaved changes; returns false if the user cancelled. */
async function resolveDirty(list: DocTab[]): Promise<boolean> {
  if (list.length === 0) return true;
  const one = list.length === 1;
  const choice = await api.ask(
    one ? `Save changes to ${title(list[0])}?` : `Save changes to ${list.length} documents?`,
    one ? 'Your changes will be lost if you don’t save them.' : list.map(title).join('\n'),
    [one ? 'Save' : 'Save All', 'Don’t Save', 'Cancel'],
  );
  if (choice === 2) return false;
  if (choice === 1) return true;
  for (const t of list) if (!(await save(t))) return false;
  return true;
}

async function closeTab(id: number) {
  const t = tabs.find((x) => x.id === id);
  if (!t) return;
  if (id !== activeId) activate(id);
  if (!(await resolveDirty(isDirty(t) ? [t] : []))) return;
  const next = nextActiveAfterClose(tabs, id);
  tabs = tabs.filter((x) => x.id !== id);
  activeId = 0;
  activate(next ?? addTab({ savedText: '' }).id);
}

let checking = false;
async function checkDisk() {
  const t = active();
  if (checking || !t.path) return;
  checking = true;
  try {
    const m = await api.stat(t.path);
    if (m === null || m === t.mtimeMs || m === t.ignoredMtime) return;
    if (!isDirty(t)) return void (await reload(t));
    const choice = await api.ask(
      `${title(t)} was changed by another program.`,
      'Reload it and lose your unsaved edits?',
      ['Reload', 'Keep my edits'],
    );
    if (choice === 0) await reload(t);
    else t.ignoredMtime = m; // don't ask again for this version; Save still warns.
  } finally {
    checking = false;
  }
}

function setView(v: 'editor' | 'split' | 'preview') {
  document.body.dataset.view = v;
  pref.set('view', v);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-cmd^="view-"]'))
    b.ariaPressed = String(b.dataset.cmd === `view-${v}`);
  if (v !== 'preview') view.focus();
}

const commands: Record<MenuCommand, () => unknown> = {
  new: () => activate(addTab({ savedText: '' }).id),
  open: async () => {
    for (const p of await api.openDialog()) await openPath(p);
  },
  save: () => save(active()),
  'save-as': () => saveAs(active()),
  'export-pdf': exportPdf,
  'close-tab': () => closeTab(activeId),
  'view-editor': () => setView('editor'),
  'view-split': () => setView('split'),
  'view-preview': () => setView('preview'),
};

// Serialise commands so two dialogs never race each other.
let queue: Promise<unknown> = Promise.resolve();
const run = (cmd: MenuCommand) => {
  queue = queue.then(commands[cmd]).catch((e) => console.error(e));
};

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-cmd]'))
  b.onclick = () => run(b.dataset.cmd as MenuCommand);
api.onMenu(run);
api.onOpenPath((p) => {
  queue = queue.then(() => openPath(p));
});
api.onFocus(() => {
  queue = queue.then(checkDisk);
});
api.onCloseRequest(() => {
  queue = queue.then(async () => {
    if (await resolveDirty(tabs.filter(isDirty))) await api.confirmClose();
  });
});

const savedView = pref.get('view');
setView(savedView === 'editor' || savedView === 'preview' ? savedView : 'split');
activate(addTab({ savedText: '' }).id);
