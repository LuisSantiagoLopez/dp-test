import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables in Node.js environment
if (typeof window === 'undefined') {
  dotenv.config();
}

// Get OpenAI API key from environment, preferring Vite's import.meta.env in browser
const OPENAI_API_KEY = typeof window === 'undefined' 
  ? process.env.VITE_OPENAI_API_KEY 
  : import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('VITE_OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const ASSISTANT_1_ID = 'asst_Uhstgtl3OSr0oygbleimaLNd';
export const ASSISTANT_2_ID = 'asst_QuPvhhxHk5jLsjjLk2qgT5hU';

// Define the tool types according to OpenAI's API
type FunctionTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      required?: string[];
      properties: Record<string, any>;
      additionalProperties?: boolean;
    };
  };
};

export const ASSISTANT_1_TOOLS: FunctionTool[] = [{
  type: "function",
  function: {
    name: "invocar_agente_sql",
    description: "Genera y ejecuta queries the SQL al llamar otro agente de AI y devolver los queries resultantes.",
    parameters: {
      type: "object",
      required: [
        "query_ingredients"
      ],
      properties: {
        query_ingredients: {
          type: "string",
          description: "Ingredientes requeridos de la base de datos como arroz, jamón, pollo"
        }
      },
      additionalProperties: false
    }
  }
}];

export const ASSISTANT_2_TOOLS: FunctionTool[] = [{
  type: "function",
  function: {
    name: "ejecuta_query_sql",
    description: "Executes a SQL query to get price information",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        }
      },
      required: ["query"]
    }
  }
}];