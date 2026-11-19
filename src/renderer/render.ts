import type { Root } from 'hast';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema, type Options as Schema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { type PluggableList, unified } from 'unified';
import { visit } from 'unist-util-visit';

export type Flavor = 'commonmark' | 'gfm' | 'extended';
export const FLAVORS: Flavor[] = ['commonmark', 'gfm', 'extended'];

const remarkPlugins: Record<Flavor, PluggableList> = {
  commonmark: [],
  gfm: [remarkGfm],
  extended: [remarkGfm, remarkMath, remarkFrontmatter],
};

// GitHub's schema, plus the classes remark-math puts on math code nodes.
const schema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
  },
};

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Point relative <img src> at the open file's directory via the thetamark-file: protocol. */
function rehypeLocalImages(baseDir: string | null) {
  return (tree: Root) => {
    if (!baseDir) return;
    const base = `file:///${baseDir.replace(/\\/g, '/').replace(/^\/+/, '')}/`;
    visit(tree, 'element', (node) => {
      const src = node.properties.src;
      if (node.tagName !== 'img' || typeof src !== 'string') return;
      if (!src || SCHEME.test(src) || src.startsWith('//')) return;
      node.properties.src = `thetamark-file://${new URL(src, base).pathname}`;
    });
  };
}

export async function renderMarkdown(
  md: string,
  flavor: Flavor,
  baseDir: string | null,
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkPlugins[flavor])
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(flavor === 'extended' ? [rehypeKatex] : [])
    .use(rehypeHighlight, { plainText: ['mermaid'] })
    .use(rehypeLocalImages, baseDir)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
