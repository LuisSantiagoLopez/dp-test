// This is the main interface module for SQL agent functionality
import { QueryResult } from './types';
import { invokeSqlAgent as invoke } from './sql/index';

// Re-export the main function with the same interface
export async function invokeSqlAgent(threadId: string, queryIngredients: string): Promise<QueryResult> {
  return invoke(threadId, queryIngredients);
}

// Export types from the SQL module
export * from './sql/types';