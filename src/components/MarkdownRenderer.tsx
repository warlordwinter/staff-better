import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-neutral max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-3xl md:text-4xl font-extrabold mb-6"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-2xl md:text-3xl font-bold mt-10 mb-4"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-xl md:text-2xl font-semibold mt-8 mb-3"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="leading-7 text-neutral-800 mb-4" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc ml-6 space-y-2 mb-4" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal ml-6 space-y-2 mb-4" {...props} />
          ),
          li: ({ ...props }) => <li className="text-neutral-800" {...props} />,
          a: ({ ...props }) => (
            <a className="text-blue-600 hover:underline" {...props} />
          ),
          hr: ({ ...props }) => <hr className="my-8" {...props} />,
          strong: ({ ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-neutral-300 pl-4 italic text-neutral-700 my-4"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => (
            <code
              className={`rounded px-1 py-0.5 bg-neutral-100 ${
                className ?? ""
              }`}
              {...props}
            >
              {children}
            </code>
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border border-neutral-200" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              className="border border-neutral-200 bg-neutral-50 p-2 text-left"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className="border border-neutral-200 p-2 align-top"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
