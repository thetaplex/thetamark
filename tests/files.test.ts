import { mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { readDoc, statMtime, writeDoc } from '../src/main/files';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'thetamark-'));
});

describe('files', () => {
  it('round-trips CRLF byte-identically', async () => {
    const p = join(dir, 'a.md');
    await writeFile(p, '# A\r\n\r\nline\r\n');
    const doc = await readDoc(p);
    expect(doc.eol).toBe('\r\n');
    expect(doc.text).toBe('# A\n\nline\n');
    const r = await writeDoc(p, `${doc.text}more\n`, doc.eol, doc.mtimeMs);
    expect(r.ok).toBe(true);
    expect(await readFile(p, 'utf8')).toBe('# A\r\n\r\nline\r\nmore\r\n');
  });

  it('keeps LF and writes UTF-8 without BOM', async () => {
    const p = join(dir, 'b.md');
    await writeFile(p, 'héllo\n');
    const doc = await readDoc(p);
    expect(doc.eol).toBe('\n');
    await writeDoc(p, doc.text, doc.eol, doc.mtimeMs);
    const bytes = await readFile(p);
    expect(bytes[0]).not.toBe(0xef);
    expect(bytes.toString('utf8')).toBe('héllo\n');
  });

  it('strips a BOM on read', async () => {
    const p = join(dir, 'c.md');
    await writeFile(p, '﻿x\n');
    expect((await readDoc(p)).text).toBe('x\n');
  });

  it('reports a conflict when the file changed on disk', async () => {
    const p = join(dir, 'd.md');
    await writeFile(p, 'one\n');
    const doc = await readDoc(p);
    await writeFile(p, 'other program\n');
    await utimes(p, new Date(), new Date(Date.now() + 5000));
    const r = await writeDoc(p, 'mine\n', doc.eol, doc.mtimeMs);
    expect(r.ok).toBe(false);
    expect(await readFile(p, 'utf8')).toBe('other program\n');
    const forced = await writeDoc(p, 'mine\n', doc.eol, null);
    expect(forced.ok).toBe(true);
    expect(await readFile(p, 'utf8')).toBe('mine\n');
    expect(await statMtime(p)).toBe(forced.mtimeMs);
  });

  it('statMtime returns null for a missing file', async () => {
    expect(await statMtime(join(dir, 'nope.md'))).toBeNull();
  });
});
