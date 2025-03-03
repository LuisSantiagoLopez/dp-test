import { createClient } from '@supabase/supabase-js';
import { createLog } from './logging';
import * as dotenv from 'dotenv';

// Load environment variables in Node.js environment
if (typeof window === 'undefined') {
  dotenv.config();
}

// Get Supabase credentials from environment, preferring Vite's import.meta.env in browser
const SUPABASE_URL = typeof window === 'undefined'
  ? process.env.VITE_SUPABASE_URL
  : import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY = typeof window === 'undefined'
  ? process.env.VITE_SUPABASE_ANON_KEY
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
}

// Initialize Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export async function saveThreadInfo(phoneNumber: string, threadId: string) {
  try {
    // Start a transaction by using multiple operations
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert([
        { phone_number: phoneNumber, thread_id: threadId }
      ]);

    if (conversationError) throw conversationError;

    // Create agent thread - directly create it here instead of importing from threads.ts
    const { data: agentThreadData, error: agentThreadError } = await supabase
      .from('agent_threads')
      .insert([
        { user_thread_id: threadId, agent_thread_id: threadId + '_agent' }
      ])
      .select()
      .single();

    if (agentThreadError) throw agentThreadError;
    
    await createLog('info', 'system', 'Thread info saved successfully', {
      phone_number: phoneNumber,
      thread_id: threadId,
      agent_thread_id: agentThreadData.agent_thread_id
    });

    return { conversationData, agentThreadId: agentThreadData.agent_thread_id };
  } catch (error: any) {
    await createLog('error', 'system', `Failed to save thread info: ${error.message}`, {
      phone_number: phoneNumber,
      thread_id: threadId,
      error: error.message
    });
    throw error;
  }
}

export async function getThreadByPhone(phoneNumber: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('thread_id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (error) {
    if (!error.message.includes('contains 0 rows')) {
      throw error;
    }
    return null;
  }
  
  return data?.thread_id;
}

export async function getAgentThread(userThreadId: string) {
  const { data, error } = await supabase
    .from('agent_threads')
    .select('agent_thread_id')
    .eq('user_thread_id', userThreadId)
    .maybeSingle();

  if (error) throw error;
  return data?.agent_thread_id;
}

export async function saveMessage(threadId: string, role: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      { thread_id: threadId, role, content }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}