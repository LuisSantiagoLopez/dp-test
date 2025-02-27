import { openai } from '../config';
import { ASSISTANT_1_ID, ASSISTANT_2_ID } from '../config';
import { addAgentMessage } from '../messages';
import { createLog } from '../../logging';
import { SqlAgentMessage, SqlAgentConfig, SqlAgentResponse } from './types';

export async function sendInitialMessage(sqlThreadId: string, ingredients: string): Promise<void> {
  await openai.beta.threads.messages.create(sqlThreadId, {
    role: 'user',
    content: `Generate a SQL query to find prices for these ingredients: ${ingredients}

CRITICAL REQUIREMENTS:
1. Use the ejecuta_query_sql function to execute the query
2. Query MUST use the price_data table
3. Include these columns:
   - nombre_generico (product name)
   - precio_promedio (average price)
   - unidad (unit)
   - nombre_ciudad (city name)
   - division
   - grupo
   - clase
   - subclase

Example query structure:
SELECT DISTINCT ON (nombre_generico)
  nombre_generico,
  precio_promedio,
  unidad,
  nombre_ciudad,
  division,
  grupo,
  clase,
  subclase
FROM price_data
WHERE nombre_generico ILIKE ANY (ARRAY['%term1%', '%term2%'])
ORDER BY nombre_generico, precio_promedio DESC`
  });
}

export async function sendToSqlAgent(config: SqlAgentConfig): Promise<SqlAgentMessage> {
  const { userThreadId, sqlThreadId, ingredients } = config;

  try {
    // Log initial communication
    addAgentMessage({
      id: Date.now().toString(),
      fromAgent: ASSISTANT_1_ID,
      toAgent: ASSISTANT_2_ID,
      content: JSON.stringify({
        function: 'invocar_agente_sql',
        arguments: { query_ingredients: ingredients }
      }),
      type: 'query',
      timestamp: Date.now(),
      threadId: userThreadId
    });

    // Send initial message to SQL Agent
    await sendInitialMessage(sqlThreadId, ingredients);

    // Get SQL Agent's response
    const messages = await openai.beta.threads.messages.list(sqlThreadId);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content[0]?.text?.value) {
      throw new Error('No valid response from SQL Agent');
    }

    try {
      const agentMessage = JSON.parse(lastMessage.content[0].text.value);
      
      // Add SQL query message to agent communication
      if (agentMessage.function === 'ejecuta_query_sql' && agentMessage.arguments.query) {
        addAgentMessage({
          id: Date.now().toString(),
          fromAgent: ASSISTANT_2_ID,
          toAgent: 'system',
          content: JSON.stringify(agentMessage),
          type: 'query',
          timestamp: Date.now(),
          threadId: userThreadId
        });
      }

      await createLog('agent', ASSISTANT_2_ID, 'SQL Agent generated query', {
        thread_id: userThreadId,
        message: agentMessage
      });

      return agentMessage;
    } catch (error) {
      throw new Error('Invalid JSON response from SQL Agent');
    }
  } catch (error: any) {
    await createLog('error', ASSISTANT_2_ID, `SQL Agent communication failed: ${error.message}`, {
      thread_id: userThreadId,
      sql_thread_id: sqlThreadId,
      ingredients,
      error: error.message
    });
    throw error;
  }
}

export function sendResponseToAgent1(userThreadId: string, response: SqlAgentResponse): void {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: ASSISTANT_2_ID,
    toAgent: ASSISTANT_1_ID,
    content: JSON.stringify(response),
    type: 'response',
    timestamp: Date.now(),
    threadId: userThreadId
  });
}