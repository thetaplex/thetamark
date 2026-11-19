import { readFile, stat, writeFile } from 'node:fs/promises';

export type { Eol } from '../shared/api';

import type { Eol } from '../shared/api';

export async function readDoc(path: string): Promise<{ text: string; eol: Eol; mtimeMs: number }> {
  let raw = await readFile(path, 'utf8');
  if (raw.startsWith('﻿')) raw = raw.slice(1);
  const eol: Eol = raw.includes('\r\n') ? '\r\n' : '\n';
  return { text: raw.replace(/\r\n/g, '\n'), eol, mtimeMs: (await stat(path)).mtimeMs };
}

export async function statMtime(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

/** expectedMtimeMs null = write unconditionally (Save As / Overwrite). */
export async function writeDoc(
  path: string,
  text: string,
  eol: Eol,
  expectedMtimeMs: number | null,
): Promise<{ ok: true; mtimeMs: number } | { ok: false; conflict: true; mtimeMs: number }> {
  if (expectedMtimeMs !== null) {
    const now = await statMtime(path);
    // ponytail: stat-then-write race window; fine for a single-user editor.
    if (now !== null && now !== expectedMtimeMs) return { ok: false, conflict: true, mtimeMs: now };
  }
  await writeFile(path, eol === '\n' ? text : text.replace(/\n/g, eol), 'utf8');
  return { ok: true, mtimeMs: (await stat(path)).mtimeMs };
}
