import React, { useState, useRef, useEffect } from 'react';
import { createThread, addMessageToThread, runAssistant, getMessages, cleanupIncompleteRuns } from './lib/openai';
import { ASSISTANT_1_ID } from './lib/agents/config';
import { saveThreadInfo, getThreadByPhone, saveMessage, getThreadMessages } from './lib/supabase';
import { createLog, getLogs, SystemLog } from './lib/logging';
import { LogSidebar } from './components/LogSidebar';
import { SystemChecklist } from './components/SystemChecklist';
import { AgentChatView } from './components/AgentChatView';
import { PhoneInput } from './components/PhoneInput';
import { ChatContainer } from './components/ChatContainer';

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    getLogs().then(setLogs).catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (threadId) {
        cleanupIncompleteRuns(threadId);
      }
    };
  }, [threadId]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await createLog('info', 'phone_submit', `Starting conversation with phone: ${phoneNumber}`);
      
      const existingThreadId = await getThreadByPhone(phoneNumber);
      
      if (existingThreadId) {
        setThreadId(existingThreadId);
        await createLog('info', 'phone_submit', `Found existing thread: ${existingThreadId}`);
        
        await cleanupIncompleteRuns(existingThreadId);
        
        const savedMessages = await getThreadMessages(existingThreadId);
        setMessages(savedMessages);
      } else {
        const thread = await createThread();
        await createLog('info', 'phone_submit', `Created new thread: ${thread.id}`);
        await saveThreadInfo(phoneNumber, thread.id);
        setThreadId(thread.id);
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Error:', error);
      await createLog('error', 'phone_submit', error.message || 'Failed to start conversation');
      setError(error.message || 'Failed to start conversation. Please try again.');
    }
    setIsLoading(false);
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadId || !message.trim() || isProcessing) return;

    const currentMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    setIsProcessing(true);
    setError(null);

    try {
      await createLog('info', 'message_submit', `Sending message to thread: ${threadId}`);

      const savedMessage = await saveMessage(threadId, 'user', currentMessage);
      setMessages(prev => [savedMessage, ...prev]);

      await addMessageToThread(threadId, currentMessage);
      
      try {
        await createLog('agent', ASSISTANT_1_ID, 'Starting assistant run');
        
        const runStatus = await runAssistant(threadId, ASSISTANT_1_ID);
        
        await createLog('agent', ASSISTANT_1_ID, `Assistant run completed with status: ${runStatus.status}`);
        
        if (runStatus.status === 'completed') {
          const updatedMessages = await getMessages(threadId);
          const assistantMessage = updatedMessages[0];
          
          if (assistantMessage && 
              assistantMessage.role === 'assistant' && 
              assistantMessage.content[0].type === 'text') {  // Add type check
            const savedAssistantMessage = await saveMessage(
              threadId,
              'assistant',
              assistantMessage.content[0].text.value
            );
            setMessages(prev => [savedAssistantMessage, ...prev]);
          }
        } else {
          throw new Error(`Assistant run failed with status: ${runStatus.status}`);
        }
      } catch (error: any) {
        await createLog('error', 'assistant_run', error.message);
        setError(error.message || 'Failed to get assistant response. Please try again.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      await createLog('error', 'message_submit', error.message);
      setError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleToggleView = (view: 'system' | 'agent') => {
    if (view === 'system') {
      setShowAgentChat(false);
      setShowSystemStatus(!showSystemStatus);
    } else {
      setShowSystemStatus(false);
      setShowAgentChat(!showAgentChat);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {showSystemStatus ? (
        <SystemChecklist />
      ) : showAgentChat ? (
        <AgentChatView messages={messages} threadId={threadId || undefined} />
      ) : (
        <LogSidebar initialLogs={logs} />
      )}
      
      <div className="flex-1 flex flex-col">
        {!threadId ? (
          <PhoneInput
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            handlePhoneSubmit={handlePhoneSubmit}
            isLoading={isLoading}
            isProcessing={isProcessing}
            error={error}
            onToggleView={handleToggleView}
            showSystemStatus={showSystemStatus}
            showAgentChat={showAgentChat}
          />
        ) : (
          <ChatContainer
            phoneNumber={phoneNumber}
            messages={messages}
            message={message}
            setMessage={setMessage}
            handleMessageSubmit={handleMessageSubmit}
            isLoading={isLoading}
            isProcessing={isProcessing}
            error={error}
            messagesEndRef={messagesEndRef}
            onToggleView={handleToggleView}
            showSystemStatus={showSystemStatus}
            showAgentChat={showAgentChat}
          />
        )}
      </div>
    </div>
  );
}

export default App;