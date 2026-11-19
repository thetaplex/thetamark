import type { Eol } from '../shared/api';

export interface Tab<S> {
  id: number;
  path: string | null;
  eol: Eol;
  mtimeMs: number | null;
  savedText: string;
  state: S;
}

export type OpenPlan = { kind: 'focus' | 'reuse'; id: number } | { kind: 'new' };

export function planOpen<T extends Tab<unknown>>(
  tabs: T[],
  activeId: number,
  path: string,
  isPristine: (t: T) => boolean,
): OpenPlan {
  const open = tabs.find((t) => t.path === path);
  if (open) return { kind: 'focus', id: open.id };
  const active = tabs.find((t) => t.id === activeId);
  if (active && active.path === null && isPristine(active)) return { kind: 'reuse', id: active.id };
  return { kind: 'new' };
}

export function nextActiveAfterClose(tabs: Tab<unknown>[], closingId: number): number | null {
  const i = tabs.findIndex((t) => t.id === closingId);
  return (tabs[i + 1] ?? tabs[i - 1])?.id ?? null;
}

export function title(tab: Tab<unknown>): string {
  return tab.path?.split(/[\\/]/).pop() ?? 'Untitled';
}
