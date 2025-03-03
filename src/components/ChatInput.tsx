import React from 'react';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  message: string;
  setMessage: (value: string) => void;
  handleMessageSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  isProcessing: boolean;
}

export function ChatInput({
  message,
  setMessage,
  handleMessageSubmit,
  isLoading,
  isProcessing
}: ChatInputProps) {
  return (
    <form onSubmit={handleMessageSubmit} className="p-4 bg-white border-t sticky bottom-0">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isProcessing ? "Please wait..." : "Type your message..."}
          className="flex-1 p-2 border rounded-md disabled:bg-gray-50 disabled:text-gray-500"
          disabled={isLoading || isProcessing}
        />
        <button
          type="submit"
          disabled={isLoading || isProcessing || !message.trim()}
          className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}