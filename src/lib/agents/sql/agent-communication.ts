import { ASSISTANT_1_ID, ASSISTANT_2_ID } from '../config';
import { addAgentMessage } from '../messages';
import { createLog } from '../../logging';
import { SqlAgentMessage, SqlAgentResponse, SqlQuerySchema, SqlResponseSchema } from './types';

export async function sendToSqlAgent(config: SqlAgentConfig): Promise<SqlAgentMessage> {
  const { userThreadId, ingredients } = config;

  try {
    // Log initial request
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

    // Format the query with proper parameter handling
    const formattedQuery = `
      WITH search_results AS (
        SELECT * FROM search_ingredients_v3($1, $2)
      )
      SELECT 
        nombre_generico,
        precio_promedio,
        unidad,
        division,
        grupo,
        clase,
        subclase,
        match_type,
        similarity,
        search_token
      FROM search_results
      WHERE similarity >= $2
      ORDER BY 
        search_token,
        similarity DESC,
        match_type;
    `.trim();

    // Create and validate query message
    const queryMessage = {
      function: 'ejecuta_query_sql' as const,
      arguments: {
        query: formattedQuery,
        params: [ingredients, 0.3]
      }
    };

    // Validate against schema
    const validatedMessage = SqlQuerySchema.parse(queryMessage);
    return validatedMessage;

  } catch (error: any) {
    await createLog('error', ASSISTANT_2_ID, `Failed to prepare SQL query: ${error.message}`, {
      thread_id: userThreadId,
      ingredients,
      error: error.message
    });
    throw error;
  }
}

export function sendResponseToAgent1(userThreadId: string, response: SqlAgentResponse): void {
  try {
    // Group results by search token for better organization
    const groupedResults = response.data?.reduce((acc: any, item: any) => {
      const token = item.search_token || 'unknown';
      if (!acc[token]) {
        acc[token] = [];
      }
      acc[token].push({
        nombre_generico: item.nombre_generico,
        precio_promedio: item.precio_promedio,
        unidad: item.unidad,
        division: item.division,
        grupo: item.grupo,
        clase: item.clase,
        subclase: item.subclase,
        match_type: item.match_type,
        similarity: item.similarity
      });
      return acc;
    }, {}) || {};

    // Prepare summary statistics
    const summary = Object.entries(groupedResults).map(([token, results]: [string, any[]]) => ({
      search_term: token,
      matches_found: results.length,
      best_match: results[0]?.nombre_generico,
      best_match_score: results[0]?.similarity,
      average_price: results.reduce((sum, r) => sum + Number(r.precio_promedio), 0) / results.length
    }));

    // Format the final response
    const formattedResponse = {
      status: response.status,
      data: groupedResults,
      metadata: {
        total_ingredients_found: Object.keys(groupedResults).length,
        total_matches: Object.values(groupedResults).flat().length,
        search_summary: summary,
        query_time: new Date().toISOString()
      }
    };

    // Validate response against schema
    const validatedResponse = SqlResponseSchema.parse(formattedResponse);

    // Send structured response
    addAgentMessage({
      id: Date.now().toString(),
      fromAgent: ASSISTANT_2_ID,
      toAgent: ASSISTANT_1_ID,
      content: JSON.stringify(validatedResponse),
      type: 'response',
      timestamp: Date.now(),
      threadId: userThreadId
    });
  } catch (error: any) {
    // Send error response if formatting fails
    const errorResponse = SqlResponseSchema.parse({
      status: 'error',
      error: `Failed to format response: ${error.message}`,
      data: response.data // Include raw data for fallback
    });

    addAgentMessage({
      id: Date.now().toString(),
      fromAgent: ASSISTANT_2_ID,
      toAgent: ASSISTANT_1_ID,
      content: JSON.stringify(errorResponse),
      type: 'error',
      timestamp: Date.now(),
      threadId: userThreadId
    });
  }
}

interface SqlAgentConfig {
  userThreadId: string;
  ingredients: string;
}