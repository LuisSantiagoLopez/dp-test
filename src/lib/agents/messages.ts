import { AgentMessage } from './types';
import { openai } from './config';
import { createLog } from '../logging';
import { ASSISTANT_1_ID } from './config';

let agentMessages: AgentMessage[] = [];

export function getAgentMessages(threadId?: string) {
  if (threadId) {
    return agentMessages.filter(msg => msg.threadId === threadId);
  }
  return [...agentMessages];
}

export async function addMessageToThread(threadId: string, content: string) {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    const activeRuns = runs.data.filter(run => 
      ['in_progress', 'queued', 'requires_action'].includes(run.status)
    );

    if (activeRuns.length > 0) {
      await createLog('info', 'system', `Found ${activeRuns.length} active runs, blocking message`, {
        thread_id: threadId,
        active_runs: activeRuns.map(run => ({ id: run.id, status: run.status }))
      });
      throw new Error('Cannot add message while another request is being processed');
    }

    agentMessages.push({
      id: Date.now().toString(),
      fromAgent: 'user',
      toAgent: ASSISTANT_1_ID,
      content,
      type: 'user',
      timestamp: Date.now(),
      threadId
    });

    await createLog('info', 'user', `User message added to thread`, {
      thread_id: threadId,
      content
    });

    return await openai.beta.threads.messages.create(
      threadId,
      { role: 'user', content }
    );
  } catch (error: any) {
    await createLog('error', 'system', `Failed to add message: ${error.message}`, {
      thread_id: threadId,
      error: error.message
    });
    throw error;
  }
}

export function addAgentMessage(message: AgentMessage) {
  // Log the agent communication
  createLog('agent', message.fromAgent, `Agent communication: ${message.fromAgent} → ${message.toAgent}`, {
    message_type: message.type,
    content_preview: typeof message.content === 'string' ? 
      (message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content) : 
      'Complex content',
    thread_id: message.threadId,
    timestamp: new Date(message.timestamp).toISOString()
  }).catch(console.error);

  // Add message to the conversation flow
  agentMessages = [...agentMessages, message];

  // If this is a response from Agent 2 to Agent 1, trigger response processing
  if (message.type === 'response' && message.fromAgent !== 'user' && message.toAgent === ASSISTANT_1_ID) {
    try {
      const response = JSON.parse(message.content);
      createLog('agent', message.toAgent, `Processing response from ${message.fromAgent}`, {
        status: response.status,
        thread_id: message.threadId,
        has_data: !!response.data,
        data_keys: response.data ? Object.keys(response.data) : [],
        response_preview: JSON.stringify(response).substring(0, 200) + '...'
      }).catch(console.error);
    } catch (error) {
      console.error('Error processing agent response:', error);
    }
  }
}

export async function getMessages(threadId: string) {
  return (await openai.beta.threads.messages.list(threadId)).data;
}