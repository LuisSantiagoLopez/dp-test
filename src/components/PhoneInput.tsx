import React from 'react';
import { Loader2 } from 'lucide-react';

interface PhoneInputProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  handlePhoneSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  onToggleView: (view: 'system' | 'agent') => void;
  showSystemStatus: boolean;
  showAgentChat: boolean;
}

export function PhoneInput({
  phoneNumber,
  setPhoneNumber,
  handlePhoneSubmit,
  isLoading,
  isProcessing,
  error,
  onToggleView,
  showSystemStatus,
  showAgentChat
}: PhoneInputProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Enter Phone Number</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onToggleView('agent');
              }}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showAgentChat ? 'Show Logs' : 'Show Agent Chat'}
            </button>
            <button
              onClick={() => {
                onToggleView('system');
              }}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showSystemStatus ? 'Show Logs' : 'Show System Status'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            className="w-full p-2 border rounded-md"
            required
            disabled={isLoading || isProcessing}
          />
          <button
            type="submit"
            disabled={isLoading || isProcessing}
            className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Start Chat'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}