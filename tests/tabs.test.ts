import { describe, expect, it } from 'vitest';
import { nextActiveAfterClose, planOpen, type Tab, title } from '../src/renderer/tabs';

const tab = (id: number, path: string | null): Tab<null> => ({
  id,
  path,
  eol: '\n',
  mtimeMs: null,
  savedText: '',
  state: null,
});

describe('tabs', () => {
  const tabs = [tab(1, '/a.md'), tab(2, null), tab(3, '/c.md')];

  it('focuses a tab that already has the path', () => {
    expect(planOpen(tabs, 2, '/c.md', () => true)).toEqual({ kind: 'focus', id: 3 });
  });

  it('reuses a pristine untitled active tab', () => {
    expect(planOpen(tabs, 2, '/new.md', () => true)).toEqual({ kind: 'reuse', id: 2 });
  });

  it('opens a new tab otherwise', () => {
    expect(planOpen(tabs, 2, '/new.md', () => false)).toEqual({ kind: 'new' });
    expect(planOpen(tabs, 1, '/new.md', () => true)).toEqual({ kind: 'new' });
  });

  it('picks the neighbour when closing', () => {
    expect(nextActiveAfterClose(tabs, 2)).toBe(3);
    expect(nextActiveAfterClose(tabs, 3)).toBe(2);
    expect(nextActiveAfterClose([tab(1, null)], 1)).toBeNull();
  });

  it('titles by basename on any OS', () => {
    expect(title(tab(1, '/x/notes.md'))).toBe('notes.md');
    expect(title(tab(1, 'C:\\x\\win.md'))).toBe('win.md');
    expect(title(tab(1, null))).toBe('Untitled');
  });
});
