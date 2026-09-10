'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          // Linear uploads need auth headers, so an <img> would just be broken.
          img: ({ alt }) => <span className="rounded bg-soft px-1.5 py-0.5 text-xs text-muted">image{alt ? `: ${alt}` : ''}</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
