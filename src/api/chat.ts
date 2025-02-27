import { createThread, addMessageToThread, runAssistant, getMessages } from '../lib/openai';
import { ASSISTANT_1_ID } from '../lib/agents/config';
import { createLog } from '../lib/logging';
import { saveThreadInfo, getThreadByPhone, saveMessage } from '../lib/supabase';
import { ChatResponse } from './types';

export async function chatHandler(message: string, phone: string): Promise<ChatResponse> {
  try {
    await createLog('info', 'api', `Processing chat request`, {
      phone: phone,
      message_length: message.length
    });

    // Get or create thread for this phone number
    let threadId = await getThreadByPhone(phone);

    if (!threadId) {
      const thread = await createThread();
      await saveThreadInfo(phone, thread.id);
      threadId = thread.id;
      await createLog('info', 'api', `Created new thread for phone: ${phone}`);
    }

    // Save user message
    const savedUserMessage = await saveMessage(threadId, 'user', message);
    await createLog('info', 'api', `Saved user message`, {
      thread_id: threadId,
      message_id: savedUserMessage.id
    });

    // Add message to OpenAI thread
    await addMessageToThread(threadId, message);

    // Run Assistant 1
    const runStatus = await runAssistant(threadId, ASSISTANT_1_ID);
    await createLog('info', 'api', `Assistant run completed`, {
      thread_id: threadId,
      status: runStatus.status
    });

    if (runStatus.status === 'completed') {
      const messages = await getMessages(threadId);
      const assistantMessage = messages[0];

      if (assistantMessage &&
        assistantMessage.role === 'assistant' &&
        assistantMessage.content[0].type === 'text' && 
        'text' in assistantMessage.content[0]) {
        const savedMessage = await saveMessage(
          threadId,
          'assistant',
          assistantMessage.content[0].text.value
        );

        const response: ChatResponse = {
          code: 200,
          response: savedMessage.content
        };

        return response;
      }
    }

    throw new Error(`Assistant run failed with status: ${runStatus.status}`);
  } catch (error: any) {
    await createLog('error', 'api', `API request failed: ${error.message}`);

    const response: ChatResponse = {
      code: 500,
      response: error.message
    };

    return response;
  }
}