import { openai } from '../config';
import { createLog } from '../../logging';
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

async function getAISearchStrategy(term: string, previousAttempts: SearchAttempt[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Eres un experto en SQL y búsqueda de productos. 
                 Analiza los intentos previos y genera una consulta SQL mejorada.
                 
                 REGLAS CRÍTICAS:
                 1. La query DEBE comenzar con SELECT
                 2. DEBE usar la tabla price_data
                 3. NO se permiten operaciones de modificación (INSERT, UPDATE, DELETE, etc)
                 4. La query debe seguir este formato:
                    SELECT 
                      nombre_generico,
                      precio_promedio,
                      unidad,
                      division,
                      grupo,
                      clase,
                      subclase
                    FROM price_data
                    WHERE nombre_generico ILIKE '%$TERM%'
                    ORDER BY precio_promedio ASC
                    LIMIT $LIMIT
                 
                 Estructura de la tabla price_data:
                 - nombre_generico (text)
                 - precio_promedio (decimal)
                 - unidad (text)
                 - division (text)
                 - grupo (text)
                 - clase (text)
                 - subclase (text)

                 ANÁLISIS DE ERRORES:
                 1. Timeout:
                    - Reduce la complejidad de WHERE
                    - Disminuye el LIMIT
                    - Simplifica el ORDER BY
                 
                 2. Sin resultados:
                    - Usa ILIKE con comodines más flexibles
                    - Simplifica condiciones WHERE
                    - Usa OR en lugar de AND
                 
                 3. Error de sintaxis:
                    - Verifica paréntesis
                    - Usa aliases explícitos
                    - Simplifica expresiones
                 
                 4. Demasiados resultados:
                    - Agrega filtros específicos
                    - Reduce el LIMIT

                 IMPORTANTE:
                 - SIEMPRE usa la tabla price_data
                 - NUNCA uses operaciones de modificación
                 - Mantén la query simple y legible
                 - Usa comentarios para explicar cambios`
      },
      {
        role: "user",
        content: `Término de búsqueda: "${term}"
                 
                 ${previousAttempts.map((attempt, index) => `
                 === INTENTO ${attempt.attempt} ===
                 Query:
                 ${attempt.query}
                 
                 Resultado:
                 - Éxito: ${attempt.success}
                 - Tiempo: ${attempt.executionTime || 'N/A'}ms
                 - Resultados: ${attempt.results.length}
                 ${attempt.bestMatch ? 
                   `- Mejor match: ${attempt.bestMatch.term} (${(attempt.bestMatch.similarity * 100).toFixed(1)}%)` 
                   : ''}
                 ${attempt.error ? 
                   `- Error: ${attempt.error}
                    - Tipo: ${attempt.errorType}` 
                   : ''}
                 
                 Análisis:
                 ${index > 0 ? `- Cambios desde intento anterior:
                   ${attempt.query !== previousAttempts[index-1].query ? 
                     '  * Query modificada' : '  * Misma query'}
                   ${attempt.error ? 
                     `  * Nuevo error: ${attempt.error}` : 
                     attempt.results.length === 0 ? 
                     '  * Sin resultados' :
                     `  * ${attempt.results.length} resultados`}` 
                   : '- Primer intento'}
                 `).join('\n')}
                 
                 Genera una nueva query SELECT usando la tabla price_data.
                 
                 Ejemplo de query válida:
                 SELECT 
                   nombre_generico,
                   precio_promedio,
                   unidad,
                   division,
                   grupo,
                   clase,
                   subclase
                 FROM price_data
                 WHERE nombre_generico ILIKE '%${term}%'
                 ORDER BY precio_promedio ASC
                 LIMIT 20;`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "text" }
  });

  const query = completion.choices[0].message.content?.trim() || '';
  
  // Validar la query antes de devolverla
  const validation = validateQuery(query);
  if (!validation.isValid) {
    // Si la query no es válida, usar una query segura por defecto
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
      WHERE nombre_generico ILIKE '%${term}%'
      ORDER BY precio_promedio ASC
      LIMIT 20
    `.trim();
  }

  return query;
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
    type: 'error',
    timestamp: Date.now(),
    threadId: context.threadId
  });
}

async function executeSearch(term: string, context: SearchContext): Promise<any[]> {
  const startTime = Date.now();
  
  try {
    const query = await getAISearchStrategy(term, context.attempts);
    
    // Preparar el intento actual
    const currentAttempt: SearchAttempt = {
      attempt: context.attempts.length + 1,
      query,
      results: [],
      success: false,
      executionTime: 0
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
      const bestMatch = results[0]; // Ya está ordenado por precio
      currentAttempt.bestMatch = {
        term: bestMatch.nombre_generico,
        similarity: 1.0 // Exact match from ILIKE
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
          allResults.push(...validResults);
          await logSearchResults(context, validResults);
        } else if (results.length > 0) {
          // Si hay resultados pero no son válidos, registrar como error de validación
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