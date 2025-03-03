import React from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import { MessageContent } from './MessageContent';

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessages({ messages, messagesEndRef }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
      <div ref={messagesEndRef} />
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {msg.role === 'user' ? (
                <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
              ) : (
                <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
              )}
              <div className="flex-1 break-words">
                <MessageContent content={[{ text: { value: msg.content } }]} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}