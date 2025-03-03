import { openai } from './config';
import { createLog } from '../logging';
import { ASSISTANT_1_ID, ASSISTANT_2_ID, ASSISTANT_1_TOOLS, ASSISTANT_2_TOOLS } from './config';
import { addAgentMessage, getMessages } from './messages';
import { ToolCallOutput } from './types';
import { invokeSqlAgent } from './sql';

export async function createThread() {
  return await openai.beta.threads.create();
}

export async function cancelRun(threadId: string, runId: string) {
  try {
    await openai.beta.threads.runs.cancel(threadId, runId);
    await createLog('info', 'system', `Cancelled run ${runId}`, {
      thread_id: threadId,
      run_id: runId
    });
  } catch (error: any) {
    console.error('Error cancelling run:', error);
    await createLog('error', 'system', `Failed to cancel run: ${error.message}`, {
      thread_id: threadId,
      run_id: runId,
      error: error.message
    });
  }
}

export async function cleanupIncompleteRuns(threadId: string) {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    const incompleteRuns = runs.data.filter(run => 
      ['in_progress', 'queued', 'requires_action'].includes(run.status)
    );
    
    if (incompleteRuns.length > 0) {
      await createLog('info', 'system', `Cleaning up ${incompleteRuns.length} incomplete runs`, {
        thread_id: threadId,
        runs: incompleteRuns.map(run => run.id)
      });
      
      await Promise.all(incompleteRuns.map(run => cancelRun(threadId, run.id)));
      // Use setTimeout instead of requestAnimationFrame
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error: any) {
    console.error('Error cleaning up runs:', error);
    await createLog('error', 'system', `Failed to clean up runs: ${error.message}`, {
      thread_id: threadId,
      error: error.message
    });
  }
}

async function processToolCall(toolCall: any, threadId: string): Promise<ToolCallOutput> {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  await createLog('agent', ASSISTANT_1_ID, `Processing tool call: ${functionName}`, {
    function: functionName,
    arguments: functionArgs,
    tool_call_id: toolCall.id
  });

  try {
    if (functionName === 'invocar_agente_sql') {
      addAgentMessage({
        id: Date.now().toString(),
        fromAgent: ASSISTANT_1_ID,
        toAgent: 'SQL_DIRECT', // Changed from ASSISTANT_2_ID
        content: JSON.stringify({
          function: functionName,
          arguments: functionArgs
        }),
        type: 'query',
        timestamp: Date.now(),
        threadId
      });

      const result = await invokeSqlAgent(threadId, functionArgs.query_ingredients);
      
      // Log the result before returning it to Assistant 1
      await createLog('agent', 'SQL_DIRECT', `SQL agent result processed`, {
        thread_id: threadId,
        status: result.status,
        has_data: !!result.data,
        data_keys: result.data ? Object.keys(result.data) : [],
        error: result.error,
        result_json: JSON.stringify(result).substring(0, 200) + '...'
      });
      
      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result)
      };
    }

    throw new Error(`Unknown function: ${functionName}`);
  } catch (error: any) {
    await createLog('error', ASSISTANT_1_ID, `Tool call failed: ${error.message}`, {
      function: functionName,
      arguments: functionArgs,
      tool_call_id: toolCall.id,
      error: error.message
    });

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ status: 'error', error: error.message })
    };
  }
}

const delay = (ms: number) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

export async function waitForRun(threadId: string, runId: string, maxAttempts = 30): Promise<any> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    if (runStatus.status === 'completed') {
      return runStatus;
    }
    
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }
    
    if (runStatus.status === 'requires_action') {
      if (runStatus.required_action?.type === 'submit_tool_outputs') {
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        
        await createLog('agent', ASSISTANT_1_ID, `Processing ${toolCalls.length} tool calls`, {
          thread_id: threadId,
          run_id: runId,
          tool_calls: toolCalls.map(tc => tc.function.name)
        });

        const toolOutputs = await Promise.all(toolCalls.map(toolCall => 
          processToolCall(toolCall, threadId)
        ));

        // Log the tool outputs before submitting them
        await createLog('agent', ASSISTANT_1_ID, `Submitting tool outputs`, {
          thread_id: threadId,
          run_id: runId,
          tool_outputs: toolOutputs.map(output => ({
            tool_call_id: output.tool_call_id,
            output_preview: output.output.substring(0, 200) + (output.output.length > 200 ? '...' : '')
          }))
        });

        await openai.beta.threads.runs.submitToolOutputs(
          threadId,
          runId,
          { tool_outputs: toolOutputs }
        );
        
        continue;
      }
      
      await cancelRun(threadId, runId);
      throw new Error('Unexpected required action from assistant');
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await delay(1000);
    }
  }
  
  await cancelRun(threadId, runId);
  throw new Error('Assistant run timed out');
}

export async function runAssistant(threadId: string, assistantId: string) {
  try {
    await cleanupIncompleteRuns(threadId);
    await createLog('agent', assistantId, `Starting assistant run`, {
      thread_id: threadId,
      assistant_id: assistantId
    });

    const run = await openai.beta.threads.runs.create(
      threadId,
      { 
        assistant_id: assistantId,
        tools: assistantId === ASSISTANT_1_ID ? ASSISTANT_1_TOOLS : ASSISTANT_2_TOOLS
      }
    );
    
    const result = await waitForRun(threadId, run.id);

    const messages = await getMessages(threadId);
    const lastMessage = messages[0];

    if (lastMessage && lastMessage.role === 'assistant') {
      addAgentMessage({
        id: Date.now().toString(),
        fromAgent: assistantId,
        toAgent: 'user',
        content: lastMessage.content[0].text.value,
        type: 'assistant',
        timestamp: Date.now(),
        threadId
      });

      await createLog('agent', assistantId, `Assistant response added`, {
        thread_id: threadId,
        content: lastMessage.content[0].text.value.substring(0, 200) + (lastMessage.content[0].text.value.length > 200 ? '...' : '')
      });
    }

    await createLog('agent', assistantId, `Assistant run completed`, {
      thread_id: threadId,
      run_id: run.id,
      status: result.status
    });

    return result;
  } catch (error: any) {
    console.error('Error running assistant:', error);
    await createLog('error', assistantId, `Assistant run failed: ${error.message}`, {
      thread_id: threadId,
      error: error.message
    });
    throw error;
  }
}