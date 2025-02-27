import { openai } from './config';
import { createLog } from '../logging';
import { supabase } from '../supabase';

// Create a thread for communication between agents
export async function createAgentThread(userThreadId: string) {
  try {
    const thread = await openai.beta.threads.create();
    
    await createLog('info', 'system', `Created agent thread: ${thread.id}`, {
      user_thread_id: userThreadId,
      agent_thread_id: thread.id
    });

    // Save the agent thread mapping
    const { error } = await supabase
      .from('agent_threads')
      .insert([
        { user_thread_id: userThreadId, agent_thread_id: thread.id }
      ]);

    if (error) throw error;

    return thread.id;
  } catch (error: any) {
    await createLog('error', 'system', `Failed to create agent thread: ${error.message}`, {
      user_thread_id: userThreadId,
      error: error.message
    });
    throw error;
  }
}

// Get the agent thread ID for a user thread
export async function getAgentThreadId(userThreadId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('agent_threads')
      .select('agent_thread_id')
      .eq('user_thread_id', userThreadId)
      .single();

    if (error) {
      if (error.message.includes('No rows found')) {
        return null;
      }
      throw error;
    }

    return data.agent_thread_id;
  } catch (error: any) {
    await createLog('error', 'system', `Failed to get agent thread: ${error.message}`, {
      user_thread_id: userThreadId,
      error: error.message
    });
    throw error;
  }
}

// Get or create SQL agent thread for a user thread
export async function getSqlAgentThread(userThreadId: string): Promise<string> {
  try {
    // First try to get existing thread
    const { data, error } = await supabase
      .from('sql_agent_threads')
      .select('sql_thread_id')
      .eq('user_thread_id', userThreadId)
      .maybeSingle(); // Use maybeSingle() instead of single()

    // If no error but no data, or if error is "no rows", create new thread
    if ((!error && !data) || (error && error.message.includes('No rows found'))) {
      // Create new SQL agent thread
      const sqlThread = await openai.beta.threads.create();
      
      await createLog('info', 'system', `Created SQL agent thread: ${sqlThread.id}`, {
        user_thread_id: userThreadId,
        sql_thread_id: sqlThread.id
      });

      // Save the SQL thread mapping
      const { error: insertError } = await supabase
        .from('sql_agent_threads')
        .insert([
          { user_thread_id: userThreadId, sql_thread_id: sqlThread.id }
        ]);

      if (insertError) throw insertError;

      return sqlThread.id;
    }

    // If there was a different error, throw it
    if (error) throw error;

    // Return existing thread ID
    return data.sql_thread_id;
  } catch (error: any) {
    await createLog('error', 'system', `Failed to get/create SQL agent thread: ${error.message}`, {
      user_thread_id: userThreadId,
      error: error.message
    });
    throw error;
  }
}

// Ensure agent thread exists, create if needed
export async function ensureAgentThread(userThreadId: string): Promise<string> {
  const agentThreadId = await getAgentThreadId(userThreadId);
  if (agentThreadId) {
    return agentThreadId;
  }
  return await createAgentThread(userThreadId);
}