import { supabase } from '../../supabase';
import { createLog } from '../../logging';
import { SqlQueryResult } from './types';

export async function executeSqlQuery(query: string, ingredients: string): Promise<SqlQueryResult> {
  try {
    await createLog('sql', 'database', `Executing query for ingredients: ${ingredients}`, { 
      query,
      ingredients
    });

    const { data, error } = await supabase.rpc('execute_sql', { 
      query_text: query 
    });

    if (error) {
      await createLog('error', 'database', `Query execution failed`, {
        query,
        ingredients,
        error: error.message
      });
      throw error;
    }

    await createLog('sql', 'database', `Query completed successfully`, {
      query,
      ingredients,
      rows_returned: data?.length || 0
    });

    return {
      query,
      result: data
    };
  } catch (error: any) {
    throw new Error(`Query execution failed: ${error.message}`);
  }
}