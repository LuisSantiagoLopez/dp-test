import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageContentProps {
  content: Array<{ text: { value: string } }>;
}

export function MessageContent({ content }: MessageContentProps) {
  const messageText = content[0]?.text?.value || '';

  // Check if the content is a system message (JSON)
  try {
    const jsonContent = JSON.parse(messageText);
    // Only filter out function calls, not actual responses with data
    if (jsonContent.function === 'ejecuta_query_sql' && !jsonContent.data) {
      return null; // Don't render system messages
    }
  } catch {
    // Not JSON, continue with markdown rendering
  }

  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
          pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2">{children}</pre>,
        }}
      >
        {messageText}
      </ReactMarkdown>
    </div>
  );
}