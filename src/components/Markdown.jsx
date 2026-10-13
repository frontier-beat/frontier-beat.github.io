import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeSummary, normalizeTitle } from '../lib/normalize';

// Contract rule 6.
const remarkPlugins = [[remarkMath, { singleDollarTextMath: true }]];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: 'ignore', trust: false }]];

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
