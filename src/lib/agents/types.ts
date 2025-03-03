import { ThreadMessage } from 'openai/resources/beta/threads/messages/messages';

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  content: string;
  type: 'query' | 'response' | 'user' | 'assistant';
  timestamp: number;
  threadId: string;
}

export interface ToolCallOutput {
  tool_call_id: string;
  output: string;
}

export interface QueryResult {
  status: 'success' | 'error';
  data?: any;
  error?: string;
}