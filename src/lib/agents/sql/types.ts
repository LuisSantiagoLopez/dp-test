import { z } from 'zod';

// Base schema for all SQL responses
export const SqlResponseSchema = z.object({
  status: z.enum(['success', 'partial_success', 'error']),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    total_ingredients_found: z.number(),
    total_matches: z.number(),
    search_summary: z.array(z.object({
      search_term: z.string(),
      matches_found: z.number(),
      best_match: z.string(),
      best_match_score: z.number(),
      average_price: z.number()
    })),
    query_time: z.string()
  }).optional()
});

// Schema for SQL query messages
export const SqlQuerySchema = z.object({
  function: z.literal('ejecuta_query_sql'),
  arguments: z.object({
    query: z.string(),
    params: z.array(z.any()).optional(),
    query_ingredients: z.string().optional()
  })
});

// Export types from schemas
export type SqlAgentMessage = z.infer<typeof SqlQuerySchema>;
export type SqlAgentResponse = z.infer<typeof SqlResponseSchema>;

// Additional types
export interface SqlQueryResult {
  query: string;
  result: any;
}

export interface SqlAgentConfig {
  userThreadId: string;
  ingredients: string;
}

export interface QueryLogMessage {
  query: string;
  ingredients: string;
  threadId: string;
}

export interface AgentCommunicationLog {
  message: string;
  type: 'query' | 'response' | 'error';
  timestamp: number;
  metadata: Record<string, any>;
}