import { addAgentMessage } from '../messages';
import { ASSISTANT_2_ID } from '../config';
import { supabase } from '../../supabase';

interface SearchAttempt {
  attempt: number;
  query: string;
  results: any[];
  success: boolean;
  error?: string;
  errorType?: 'timeout' | 'syntax' | 'no_results' | 'execution' | 'validation';
  executionTime?: number;
  matchCount?: number;
  search_token?: string;
  bestMatch?: {
    term: string;
    similarity: number;
  };
}

interface SearchContext {
  originalTerms: string;
  attempts: SearchAttempt[];
  foundTerms: Set<string>;
  threadId: string;
}

function validateQuery(query: string): { isValid: boolean; error?: string } {
  // Normalizar la query
  const normalizedQuery = query.toLowerCase().trim();

  // Verificar que comienza con SELECT
  if (!normalizedQuery.startsWith('select')) {
    return {
      isValid: false,
      error: 'Query must start with SELECT'
    };
  }

  // Verificar que no contiene operaciones prohibidas
  const forbiddenOperations = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create'];
  for (const op of forbiddenOperations) {
    if (normalizedQuery.includes(op)) {
      return {
        isValid: false,
        error: `Query contains forbidden operation: ${op}`
      };
    }
  }

  // Verificar que usa la tabla price_data
  if (!normalizedQuery.includes('from price_data')) {
    return {
      isValid: false,
      error: 'Query must select from price_data table'
    };
  }

  return { isValid: true };
}

// Generate a search query based on the term without using AI
function generateSearchQuery(term: string, attemptNumber: number): string {
  // Sanitize the term
  const sanitizedTerm = term.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim();
  
  // Different query strategies based on attempt number
  switch (attemptNumber) {
    case 1:
      // First attempt: Simple exact match
      return `
        SELECT 
          nombre_generico,
          precio_promedio,
          unidad,
          division,
          grupo,
          clase,
          subclase
        FROM price_data
        WHERE lower(unaccent(nombre_generico)) = lower(unaccent('${sanitizedTerm}'))
        ORDER BY precio_promedio ASC
        LIMIT 10
      `;
    
    case 2:
      // Second attempt: Partial match with ILIKE
      return `
        SELECT 
          nombre_generico,
          precio_promedio,
          unidad,
          division,
          grupo,
          clase,
          subclase
        FROM price_data
        WHERE lower(unaccent(nombre_generico)) ILIKE '%${sanitizedTerm}%'
        ORDER BY precio_promedio ASC
        LIMIT 15
      `;
    
    case 3:
      // Third attempt: Fuzzy match with similarity
      return `
        SELECT 
          nombre_generico,
          precio_promedio,
          unidad,
          division,
          grupo,
          clase,
          subclase,
          similarity(lower(unaccent(nombre_generico)), lower(unaccent('${sanitizedTerm}'))) as sim
        FROM price_data
        WHERE similarity(lower(unaccent(nombre_generico)), lower(unaccent('${sanitizedTerm}'))) > 0.3
        ORDER BY sim DESC, precio_promedio ASC
        LIMIT 20
      `;
    
    default:
      // Fallback to using the built-in search function
      return `
        SELECT 
          nombre_generico,
          precio_promedio,
          unidad,
          division,
          grupo,
          clase,
          subclase
        FROM search_ingredients_v3('${sanitizedTerm}', 0.3)
        LIMIT 20
      `;
  }
}

async function logSearchAttempt(context: SearchContext, query: string, term: string) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: ASSISTANT_2_ID,
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_attempt',
      attempt: context.attempts.length + 1,
      terms: [term],
      query
    }),
    type: 'query',
    timestamp: Date.now(),
    threadId: context.threadId
  });
}

async function logSearchResults(context: SearchContext, results: any[]) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: ASSISTANT_2_ID,
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_results',
      attempt: context.attempts.length + 1,
      matches_found: results.length,
      found_terms: Array.from(context.foundTerms)
    }),
    type: 'response',
    timestamp: Date.now(),
    threadId: context.threadId
  });
}

async function logSearchError(context: SearchContext, error: string, errorType: SearchAttempt['errorType']) {
  addAgentMessage({
    id: Date.now().toString(),
    fromAgent: ASSISTANT_2_ID,
    toAgent: 'system',
    content: JSON.stringify({
      type: 'search_error',
      attempt: context.attempts.length + 1,
      error,
      errorType
    }),
    type: 'query', // Changed from 'error' to 'query' to match the allowed types
    timestamp: Date.now(),
    threadId: context.threadId
  });
}

async function executeSearch(term: string, context: SearchContext): Promise<any[]> {
  const startTime = Date.now();
  
  try {
    // Generate query based on attempt number without using AI
    const attemptNumber = context.attempts.filter(a => 
      a.search_token === term || a.search_token === undefined
    ).length + 1;
    
    const query = generateSearchQuery(term, attemptNumber);
    
    // Prepare the current attempt
    const currentAttempt: SearchAttempt = {
      attempt: context.attempts.length + 1,
      query,
      results: [],
      success: false,
      executionTime: 0,
      search_token: term
    };
    
    await logSearchAttempt(context, query, term);

    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: query
    });

    currentAttempt.executionTime = Date.now() - startTime;

    if (error) {
      currentAttempt.error = error.message;
      currentAttempt.errorType = error.message.includes('timeout') ? 'timeout' :
                                error.message.includes('syntax') ? 'syntax' :
                                'execution';
      context.attempts.push(currentAttempt);
      await logSearchError(context, error.message, currentAttempt.errorType);
      throw error;
    }

    const results = data || [];
    currentAttempt.results = results;
    currentAttempt.success = true;
    
    if (results.length > 0) {
      const bestMatch = results[0]; // Already sorted by price or similarity
      currentAttempt.bestMatch = {
        term: bestMatch.nombre_generico,
        similarity: bestMatch.similarity || 1.0
      };
    }

    context.attempts.push(currentAttempt);
    return results;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    if (error.message.includes('timeout')) {
      await logSearchError(context, `Query timeout after ${executionTime}ms: ${error.message}`, 'timeout');
      return [];
    }
    
    throw error;
  }
}

function validateMatch(term: string, result: any): boolean {
  const normalizedTerm = term.toLowerCase().trim();
  const normalizedResult = result.nombre_generico.toLowerCase().trim();
  
  return normalizedResult.includes(normalizedTerm) || normalizedTerm.includes(normalizedResult);
}

export async function recursiveSearch(threadId: string, ingredients: string): Promise<any> {
  const context: SearchContext = {
    originalTerms: ingredients,
    attempts: [],
    foundTerms: new Set(),
    threadId
  };

  // Split ingredients into individual terms
  const searchTerms = ingredients
    .split(',')
    .map(term => term.trim())
    .filter(term => term.length > 0);

  let allResults: any[] = [];
  const MAX_ATTEMPTS_PER_TERM = 3;

  // Try searching for each term
  for (const term of searchTerms) {
    let termFound = false;
    let attempts = 0;

    while (!termFound && attempts < MAX_ATTEMPTS_PER_TERM) {
      try {
        const results = await executeSearch(term, context);
        
        // Validate results
        const validResults = results.filter(result => 
          validateMatch(term, result)
        );

        if (validResults.length > 0) {
          termFound = true;
          context.foundTerms.add(term);
          
          // Add search_token to each result if not present
          const resultsWithToken = validResults.map(result => ({
            ...result,
            search_token: term
          }));
          
          allResults.push(...resultsWithToken);
          await logSearchResults(context, validResults);
        } else if (results.length > 0) {
          // If there are results but none are valid, register as validation error
          await logSearchError(
            context, 
            `Found ${results.length} results but none met validation criteria`,
            'validation'
          );
        } else {
          await logSearchError(context, 'No results found', 'no_results');
        }

      } catch (error: any) {
        await logSearchError(
          context,
          `Search failed: ${error.message}`,
          error.message.includes('timeout') ? 'timeout' :
          error.message.includes('syntax') ? 'syntax' :
          'execution'
        );
      }

      attempts++;
      
      if (!termFound && attempts < MAX_ATTEMPTS_PER_TERM) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!termFound) {
      await logSearchError(context, `No valid matches found for term: ${term}`, 'no_results');
    }
  }

  return {
    status: context.foundTerms.size === searchTerms.length ? 'success' : 
           context.foundTerms.size > 0 ? 'partial_success' : 'error',
    data: allResults,
    metadata: {
      attempts: context.attempts,
      found_terms: Array.from(context.foundTerms)
    }
  };
}