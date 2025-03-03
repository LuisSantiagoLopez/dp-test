import { z } from 'zod';

// Base schema for all SQL responses
export const SqlResponseSchema = z.object({
  status: z.enum(['success', 'partial_success', 'error']),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    found_terms: z.array(z.string()).optional(),
    total_matches: z.number().optional(),
    query_time: z.string().optional()
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