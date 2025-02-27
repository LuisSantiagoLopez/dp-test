import { chatHandler } from './chat';
import { ChatRequest } from './types';

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    // Log incoming request
    console.log(`API Request: ${request.method} ${url.pathname}`);
    
    try {
      // Route requests
      if (url.pathname === '/api/chat') {
        const body: ChatRequest = await request.json();
        return await chatHandler(body.message, body.phoneNumber);
      }

      // Handle 404
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } catch (error: any) {
      // Global error handler
      console.error('API Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }
};