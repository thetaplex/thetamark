import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/renderer/render';

const table = '| a | b |\n|---|---|\n| 1 | 2 |\n';

describe('renderMarkdown', () => {
  it('commonmark: no tables, no strikethrough', async () => {
    const html = await renderMarkdown(`${table}\n~~x~~\n`, 'commonmark', null);
    expect(html).not.toContain('<table>');
    expect(html).toContain('~~x~~');
  });

  it('gfm: tables, task lists, strikethrough, autolinks, footnotes', async () => {
    const md = `${table}\n- [x] done\n\n~~x~~ www.example.com\n\nnote[^1]\n\n[^1]: here\n`;
    const html = await renderMarkdown(md, 'gfm', null);
    expect(html).toContain('<table>');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
    expect(html).toContain('<del>x</del>');
    expect(html).toContain('href="http://www.example.com"');
    expect(html).toContain('user-content-fn-1');
  });

  it('gfm: front matter shows as text, extended hides it', async () => {
    const md = '---\ntitle: Secret\n---\n\nbody\n';
    expect(await renderMarkdown(md, 'gfm', null)).toContain('Secret');
    const ext = await renderMarkdown(md, 'extended', null);
    expect(ext).not.toContain('Secret');
    expect(ext).toContain('body');
  });

  it('extended: math and mermaid', async () => {
    const md = 'inline $x^2$\n\n$$\ny=1\n$$\n\n```mermaid\ngraph TD; A-->B\n```\n';
    const html = await renderMarkdown(md, 'extended', null);
    expect(html).toContain('class="katex"');
    expect(html).toContain('katex-display');
    expect(html).toContain('language-mermaid');
    expect(html).toContain('<code class="language-mermaid">graph TD; A-->B');
  });

  it('highlights known languages and tolerates unknown ones', async () => {
    const html = await renderMarkdown(
      '```js\nconst a = 1\n```\n\n```nosuchlang\nx\n```\n',
      'commonmark',
      null,
    );
    expect(html).toContain('hljs');
    expect(html).toContain('language-nosuchlang');
  });

  it('sanitizes scripts, event handlers and javascript: links', async () => {
    const md =
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[a](javascript:alert(1))\n';
    for (const flavor of ['commonmark', 'gfm', 'extended'] as const) {
      const html = await renderMarkdown(md, flavor, null);
      expect(html).not.toContain('<script');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('javascript:');
    }
  });

  it('rewrites relative images against the base dir', async () => {
    const md = '![a](img/a.png) ![b](https://x.test/b.png) ![c](/abs/c.png) ![d](my%20pic.png)';
    const html = await renderMarkdown(md, 'gfm', '/notes/dir');
    expect(html).toContain('src="thetamark-file:///notes/dir/img/a.png"');
    expect(html).toContain('src="https://x.test/b.png"');
    expect(html).toContain('src="thetamark-file:///abs/c.png"');
    expect(html).toContain('src="thetamark-file:///notes/dir/my%20pic.png"');
    expect(await renderMarkdown(md, 'gfm', null)).toContain('src="img/a.png"');
  });
});
