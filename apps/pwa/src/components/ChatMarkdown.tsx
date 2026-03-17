import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  // Open links in new tab
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Strip images (out of scope)
  img: () => null,
  // Strip tables (out of scope)
  table: () => null,
};

export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
