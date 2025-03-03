import React from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ChatContainerProps {
  phoneNumber: string;
  messages: Message[];
  message: string;
  setMessage: (value: string) => void;
  handleMessageSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onToggleView: (view: 'system' | 'agent') => void;
  showSystemStatus: boolean;
  showAgentChat: boolean;
}

export function ChatContainer({
  phoneNumber,
  messages,
  message,
  setMessage,
  handleMessageSubmit,
  isLoading,
  isProcessing,
  error,
  messagesEndRef,
  onToggleView,
  showSystemStatus,
  showAgentChat
}: ChatContainerProps) {
  return (
    <div className="flex-1 flex flex-col max-h-screen">
      <ChatHeader
        phoneNumber={phoneNumber}
        isProcessing={isProcessing}
        onToggleView={onToggleView}
        showSystemStatus={showSystemStatus}
        showAgentChat={showAgentChat}
      />
      
      <ChatMessages
        messages={messages}
        messagesEndRef={messagesEndRef}
      />

      {error && (
        <div className="p-3 mx-4 mb-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <ChatInput
        message={message}
        setMessage={setMessage}
        handleMessageSubmit={handleMessageSubmit}
        isLoading={isLoading}
        isProcessing={isProcessing}
      />
    </div>
  );
}