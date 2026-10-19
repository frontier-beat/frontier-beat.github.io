import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import { mathSafety, normalizeSummary, normalizeTitle } from '../lib/normalize';
import { splitTex } from '../lib/digest';

// Contract rule 6.
const KATEX_OPTIONS = { throwOnError: false, strict: 'ignore', trust: false };
const remarkPlugins = [[remarkMath, { singleDollarTextMath: true }]];
const rehypePlugins = [[rehypeKatex, KATEX_OPTIONS]];

// Contract rule 4: keep the text, drop the structure.
const disallowedElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'table', 'blockquote', 'hr'];

export function Summary({ text, version }) {
  return (
    <div className="summary">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        disallowedElements={disallowedElements}
        unwrapDisallowed
        skipHtml
      >
        {normalizeSummary(text, version)}
      </ReactMarkdown>
    </div>
  );
}

// KaTeX output is markup KaTeX built from the TeX (trust: false), so it is
// safe to inject; the text around it stays React text.
function Inline({ text }) {
  return splitTex(text.replace(/\s*\n\s*/g, ' ')).map((part, i) => (part.type === 'text' ? (
    <Fragment key={i}>{part.value}</Fragment>
  ) : (
    <span
      key={i}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: katex.renderToString(mathSafety(part.value), { ...KATEX_OPTIONS, displayMode: part.display }) }}
    />
  )));
}

// Text extracted verbatim from the paper (abstract, captions, citing
// sentences): not markdown, only $...$ math. With `paragraphs`, blank lines
// separate <p> elements.
export function TexText({ text, paragraphs = false }) {
  if (typeof text !== 'string' || !text.trim()) return null;
  if (!paragraphs) return <Inline text={text.trim()} />;
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => <p key={i}><Inline text={p} /></p>);
}

const inlineComponents = { p: Fragment };

export function Title({ text }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={inlineComponents}
      disallowedElements={disallowedElements}
      unwrapDisallowed
      skipHtml
    >
      {normalizeTitle(text)}
    </ReactMarkdown>
  );
}
