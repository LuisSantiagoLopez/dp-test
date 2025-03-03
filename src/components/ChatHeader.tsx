import React from 'react';
import { Loader2 } from 'lucide-react';

interface ChatHeaderProps {
  phoneNumber: string;
  isProcessing: boolean;
  onToggleView: (view: 'system' | 'agent') => void;
  showSystemStatus: boolean;
  showAgentChat: boolean;
}

export function ChatHeader({
  phoneNumber,
  isProcessing,
  onToggleView,
  showSystemStatus,
  showAgentChat
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b bg-white flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Chat ({phoneNumber})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleView('agent')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {showAgentChat ? 'Show Logs' : 'Show Agent Chat'}
          </button>
          <button
            onClick={() => onToggleView('system')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {showSystemStatus ? 'Show Logs' : 'Show System Status'}
          </button>
        </div>
      </div>
      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Processing...</span>
        </div>
      )}
    </div>
  );
}