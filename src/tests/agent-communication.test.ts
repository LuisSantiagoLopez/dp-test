import { describe, test, expect, vi, beforeEach } from 'vitest';
import { openai } from '../lib/agents/config';
import { ASSISTANT_1_ID, ASSISTANT_2_ID } from '../lib/agents/config';
import { getAgentMessages, addAgentMessage } from '../lib/agents/messages';

// Mock the OpenAI client
vi.mock('../lib/agents/config', () => ({
  ASSISTANT_1_ID: 'asst_test_1',
  ASSISTANT_2_ID: 'asst_test_2',
  openai: {
    beta: {
      threads: {
        create: vi.fn(() => Promise.resolve({ id: 'thread_test123' })),
        messages: {
          create: vi.fn(() => Promise.resolve({
            id: 'msg_1',
            role: 'user',
            content: [{ text: { value: 'test query' } }]
          })),
          list: vi.fn(() => Promise.resolve({
            data: [{
              id: 'msg_2',
              role: 'assistant',
              content: [{
                text: {
                  value: JSON.stringify({
                    ingredients: [
                      { name: 'Frijol', price: 35.50, unit: 'kg' },
                      { name: 'Pan Bolillo', price: 2.50, unit: 'pieza' },
                      { name: 'Queso', price: 120.00, unit: 'kg' }
                    ]
                  })
                }
              }]
            }]
          }))
        },
        runs: {
          create: vi.fn(() => Promise.resolve({
            id: 'run_test123',
            status: 'requires_action',
            required_action: {
              type: 'submit_tool_outputs',
              submit_tool_outputs: {
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'invocar_agente_sql',
                    arguments: JSON.stringify({
                      query_ingredients: 'frijol, bolillo, queso'
                    })
                  }
                }]
              }
            }
          })),
          list: vi.fn(() => Promise.resolve({ data: [] })),
          retrieve: vi.fn(() => Promise.resolve({ status: 'completed' })),
          submitToolOutputs: vi.fn(() => Promise.resolve({})),
          cancel: vi.fn(() => Promise.resolve({}))
        }
      }
    }
  }
}));

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({
      data: [
        { nombre_generico: 'Frijol', precio_promedio: 35.50, unidad: 'kg' },
        { nombre_generico: 'Pan Bolillo', precio_promedio: 2.50, unidad: 'pieza' },
        { nombre_generico: 'Queso', precio_promedio: 120.00, unidad: 'kg' }
      ],
      error: null
    }))
  }
}));

// Mock createLog to prevent actual logging
vi.mock('../lib/logging', () => ({
  createLog: vi.fn(() => Promise.resolve({}))
}));

describe('Agent Communication Flow', () => {
  const mockQuery = 'Enséñame el desglose de ingredientes para unos molletes con frijol, bolillo y queso para 1 persona';
  const threadId = 'thread_test123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset agent messages before each test
    const messages = getAgentMessages();
    messages.length = 0;
  });

  test('should process ingredient query through both agents', async () => {
    // Create a new thread
    const thread = await openai.beta.threads.create();
    expect(thread.id).toBe(threadId);

    // Add user message
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: mockQuery
    });
    expect(message.role).toBe('user');

    // Simulate Agent 1 sending query to Agent 2
    addAgentMessage({
      id: 'msg_1',
      fromAgent: ASSISTANT_1_ID,
      toAgent: ASSISTANT_2_ID,
      content: JSON.stringify({
        function: 'invocar_agente_sql',
        arguments: { query_ingredients: 'frijol, bolillo, queso' }
      }),
      type: 'query',
      timestamp: Date.now(),
      threadId
    });

    // Simulate Agent 2 responding to Agent 1
    addAgentMessage({
      id: 'msg_2',
      fromAgent: ASSISTANT_2_ID,
      toAgent: ASSISTANT_1_ID,
      content: JSON.stringify({
        status: 'success',
        data: [
          { nombre_generico: 'Frijol', precio_promedio: 35.50, unidad: 'kg' },
          { nombre_generico: 'Pan Bolillo', precio_promedio: 2.50, unidad: 'pieza' },
          { nombre_generico: 'Queso', precio_promedio: 120.00, unidad: 'kg' }
        ]
      }),
      type: 'response',
      timestamp: Date.now(),
      threadId
    });

    // Run Agent 1 (Main Assistant)
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_1_ID
    });
    expect(run.status).toBe('requires_action');
    expect(run.required_action?.type).toBe('submit_tool_outputs');

    const toolCall = run.required_action?.submit_tool_outputs.tool_calls[0];
    expect(toolCall?.function.name).toBe('invocar_agente_sql');

    const args = JSON.parse(toolCall?.function.arguments || '{}');
    expect(args.query_ingredients).toBe('frijol, bolillo, queso');

    // Get final messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = JSON.parse(messages.data[0].content[0].text.value);
    
    expect(response.ingredients).toHaveLength(3);
    expect(response.ingredients[0]).toHaveProperty('name');
    expect(response.ingredients[0]).toHaveProperty('price');
    expect(response.ingredients[0]).toHaveProperty('unit');

    // Verify agent messages flow
    const agentMessages = getAgentMessages(thread.id);
    expect(agentMessages.length).toBe(2);
    expect(agentMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromAgent: ASSISTANT_1_ID,
          toAgent: ASSISTANT_2_ID,
          type: 'query'
        }),
        expect.objectContaining({
          fromAgent: ASSISTANT_2_ID,
          toAgent: ASSISTANT_1_ID,
          type: 'response'
        })
      ])
    );
  });
});