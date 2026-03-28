'use client';

import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), { ssr: false });

export default function MarkdownViewer({ content }: { content: string }) {
  return (
    <article
      style={{
        lineHeight: 1.7,
        fontSize: '0.95rem',
      }}
      className='markdown-body'
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const language = /language-(\w+)/.exec(className ?? '')?.[1];
            if (language === 'mermaid') {
              return <MermaidDiagram chart={String(children).trim()} />;
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
