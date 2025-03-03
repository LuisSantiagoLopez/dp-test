// This is the main interface module for SQL agent functionality
import { QueryResult } from '../types';
import { createLog } from '../../logging';
import { ASSISTANT_1_ID } from '../config';
import { addAgentMessage } from '../messages';
import { supabase } from '../../supabase';
import { SqlAgentResponse } from './types';

// Main function to invoke SQL agent (now using direct queries)
export async function invokeSqlAgent(threadId: string, queryIngredients: string): Promise<QueryResult> {
  try {
    await createLog('agent', 'SQL_DIRECT', 'Starting direct SQL query', {
      thread_id: threadId,
      ingredients: queryIngredients
    });

    // Parse ingredients into individual terms
    const searchTerms = queryIngredients
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0);
    
    // Execute direct queries for each term
    const results = await executeDirectQueries(threadId, searchTerms);
    
    // Process and group results by search token
    const groupedResults = results.reduce((acc: any, item: any) => {
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

    // Log the grouped results for debugging
    await createLog('sql', 'SQL_DIRECT', `Processed results for ${Object.keys(groupedResults).length} terms`, {
      thread_id: threadId,
      result_count: results.length,
      terms_found: Object.keys(groupedResults),
      sample_data: Object.entries(groupedResults).map(([term, items]) => ({
        term,
        count: Array.isArray(items) ? items.length : 0,
        sample: Array.isArray(items) ? items.slice(0, 1) : null
      }))
    });

    // Prepare success response with grouped data
    const response: SqlAgentResponse = {
      status: Object.keys(groupedResults).length > 0 ? 'success' : 'error',
      data: groupedResults,
      metadata: {
        found_terms: Object.keys(groupedResults),
        total_matches: results.length,
        query_time: new Date().toISOString()
      }
    };

    // Send response back to Agent 1
    sendResponseToAgent1(threadId, response);
    return response;
  } catch (error: any) {
    const errorResponse: SqlAgentResponse = {
      status: 'error',
      error: error.message
    };

    await createLog('error', 'SQL_DIRECT', `SQL Direct Query failed: ${error.message}`, {
      thread_id: threadId,
      error: error.message,
      stack: error.stack,
      ingredients: queryIngredients
    });

    sendResponseToAgent1(threadId, errorResponse);
    return errorResponse;
  }
}

// Execute direct SQL queries for each search term
async function executeDirectQueries(threadId: string, searchTerms: string[]): Promise<any[]> {
  let allResults: any[] = [];
  
  for (const term of searchTerms) {
    try {
      // Log the search attempt
      await logSearchAttempt(threadId, term);
      
      // Use the existing search_ingredients_v3 function in the database
      const { data, error } = await supabase.rpc('search_ingredients_v3', {
        search_terms: term,
        similarity_threshold: 0.3
      });
      
      if (error) {
        await logSearchError(threadId, term, error.message);
      } else if (data && data.length > 0) {
        allResults = [...allResults, ...data];
        await logSearchSuccess(threadId, term, data.length);
        
        // Log detailed results for debugging
        await createLog('sql', 'SQL_DIRECT', `Found ${data.length} results for term: ${term}`, {
          thread_id: threadId,
          term,
          sample_results: data.slice(0, 3),
          full_result_count: data.length
        });
      } else {
        await logSearchError(threadId, term, 'No results found');
      }
    } catch (error: any) {
      await logSearchError(threadId, term, error.message);
    }
  }
  
  return allResults;
}

// Log search attempt
async function logSearchAttempt(threadId: string, term: string) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: 'SQL_DIRECT',
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_attempt',
      attempt: 1,
      terms: [term]
    }),
    type: 'query',
    timestamp: Date.now(),
    threadId
  });
  
  await createLog('sql', 'SQL_DIRECT', `Searching for term: ${term}`, {
    thread_id: threadId,
    term,
    timestamp: new Date().toISOString()
  });
}

// Log search success
async function logSearchSuccess(threadId: string, term: string, resultCount: number) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: 'SQL_DIRECT',
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_results',
      attempt: 1,
      matches_found: resultCount,
      found_terms: [term]
    }),
    type: 'response',
    timestamp: Date.now(),
    threadId
  });
  
  await createLog('sql', 'SQL_DIRECT', `Found ${resultCount} results for term: ${term}`, {
    thread_id: threadId,
    term,
    result_count: resultCount,
    timestamp: new Date().toISOString()
  });
}

// Log search error
async function logSearchError(threadId: string, term: string, errorMessage: string) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: 'SQL_DIRECT',
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_error',
      attempt: 1,
      error: errorMessage
    }),
    type: 'error',
    timestamp: Date.now(),
    threadId
  });
  
  await createLog('error', 'SQL_DIRECT', `Search error for term: ${term}`, {
    thread_id: threadId,
    term,
    error: errorMessage,
    timestamp: new Date().toISOString()
  });
}

// Send response to Agent 1
function sendResponseToAgent1(threadId: string, response: SqlAgentResponse): void {
  // Create a detailed log of what's being sent to Assistant 1
  createLog('agent', 'SQL_DIRECT', `Sending response to Agent 1`, {
    thread_id: threadId,
    response_status: response.status,
    terms_found: response.metadata?.found_terms || [],
    has_data: !!response.data,
    data_keys: response.data ? Object.keys(response.data) : [],
    response_json: JSON.stringify(response).substring(0, 200) + '...',
    timestamp: new Date().toISOString()
  }).catch(console.error);

  // Add the message to the agent communication flow
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: 'SQL_DIRECT',
    toAgent: ASSISTANT_1_ID,
    content: JSON.stringify(response),
    type: 'response',
    timestamp: Date.now(),
    threadId
  });
}

// Export types from the SQL module
export * from './types';