import { ASSISTANT_2_ID } from '../config';
import { createLog } from '../../logging';
import { QueryResult } from '../types';
import { sendToSqlAgent, sendResponseToAgent1 } from './agent-communication';
import { SqlAgentResponse } from './types';
import { recursiveSearch } from './recursive-search';

export async function invokeSqlAgent(threadId: string, queryIngredients: string): Promise<QueryResult> {
  try {
    await createLog('agent', ASSISTANT_2_ID, 'Starting SQL Agent invocation', {
      thread_id: threadId,
      ingredients: queryIngredients
    });

    // Start recursive search
    const searchResult = await recursiveSearch(threadId, queryIngredients);

    // Process and group results by search token
    const groupedResults = searchResult.data.reduce((acc: any, item: any) => {
      if (!acc[item.search_token]) {
        acc[item.search_token] = [];
      }
      acc[item.search_token].push({
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
    }, {});

    // Prepare success response with grouped data
    const response: SqlAgentResponse = {
      status: searchResult.status,
      data: groupedResults,
      metadata: searchResult.metadata
    };

    // Send response back to Agent 1
    sendResponseToAgent1(threadId, response);
    return response;
  } catch (error: any) {
    const errorResponse: SqlAgentResponse = {
      status: 'error',
      error: error.message
    };

    await createLog('error', ASSISTANT_2_ID, `SQL Agent failed: ${error.message}`, {
      thread_id: threadId,
      error: error.message,
      stack: error.stack,
      ingredients: queryIngredients
    });

    sendResponseToAgent1(threadId, errorResponse);
    return errorResponse;
  }
}