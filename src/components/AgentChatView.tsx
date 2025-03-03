import React from 'react';
import { MessageSquare, Bot, Database, ArrowRight, Clock, Code2, AlertCircle, Search, CheckCircle } from 'lucide-react';
import { getAgentMessages } from '../lib/agents/messages';
import { ASSISTANT_1_ID } from '../lib/agents/config';

interface Message {
  id: string;
  role: string;
  content: Array<{ text: { value: string } }>;
}

interface AgentChatViewProps {
  messages: Message[];
  threadId?: string;
}

let messageCounter = 0;

export function AgentChatView({ messages, threadId }: AgentChatViewProps) {
  const agentMessages = getAgentMessages(threadId);

  const getUniqueKey = (msg: any, context?: string) => {
    messageCounter++;
    return `${msg.id}-${msg.timestamp}-${messageCounter}${context ? `-${context}` : ''}`;
  };

  const formatContent = (content: string, type: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Check if this is a SQL query message
      if (parsed.function === 'ejecuta_query_sql' && parsed.arguments?.query) {
        return (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">SQL Query</span>
              </div>
              <span className="text-xs text-gray-400">Generated by Agent 2</span>
            </div>
            <pre className="p-4 text-gray-100 overflow-x-auto">
              {parsed.arguments.query}
            </pre>
          </div>
        );
      }

      // Format search attempt messages
      if (parsed.type === 'search_attempt') {
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-blue-700">Search Attempt #{parsed.attempt}</span>
              </div>
              <div className="text-sm text-blue-600">
                Searching for: {parsed.terms.join(', ')}
              </div>
            </div>
            {parsed.query && (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">Generated SQL Query</span>
                  </div>
                </div>
                <pre className="p-4 text-gray-100 overflow-x-auto text-sm">
                  {parsed.query}
                </pre>
              </div>
            )}
          </div>
        );
      }

      // Format search results
      if (parsed.type === 'search_results') {
        return (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-700">Search Results #{parsed.attempt}</span>
            </div>
            <div className="text-sm text-green-600">
              Found {parsed.matches_found} matches
              {parsed.found_terms.length > 0 && (
                <div className="mt-1">
                  Matched terms: {parsed.found_terms.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Format search errors
      if (parsed.type === 'search_error') {
        return (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-700">Search Error #{parsed.attempt}</span>
            </div>
            <div className="text-sm text-red-600">{parsed.error}</div>
          </div>
        );
      }

      // Format SQL Agent response with grouped results
      if (type === 'response' && parsed.status) {
        return (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-700">SQL Agent Response</span>
            </div>
            {parsed.status === 'success' || parsed.status === 'partial_success' ? (
              <div className="space-y-4">
                <div className="text-sm text-green-600 font-medium">
                  {parsed.status === 'success' ? 'Success' : 'Partial Success'}
                </div>
                {parsed.metadata && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <div className="font-medium text-blue-700 mb-2">Search Summary</div>
                    <div className="text-blue-600">
                      Found matches for {parsed.metadata.found_terms?.length || 0} terms
                      {parsed.metadata.total_matches && (
                        <div className="mt-1">
                          Total matches: {parsed.metadata.total_matches}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {parsed.data && typeof parsed.data === 'object' && (
                  <div className="space-y-4">
                    {Object.entries(parsed.data).map(([token, results]: [string, any], tokenIndex: number) => (
                      <div key={getUniqueKey({ id: token, timestamp: tokenIndex }, 'token')} className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Search term: "{token}"
                        </div>
                        <div className="space-y-2">
                          {results.map((item: any, itemIndex: number) => (
                            <div 
                              key={getUniqueKey({ id: item.nombre_generico, timestamp: itemIndex }, `${token}-result`)} 
                              className="text-sm flex items-start gap-2 p-2 bg-gray-50 rounded"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.nombre_generico}</div>
                                <div className="text-gray-600">
                                  {item.precio_promedio} per {item.unidad}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.division} → {item.grupo} → {item.clase}
                                </div>
                              </div>
                              <div className="text-xs">
                                <div className="text-gray-500">
                                  Match: {item.match_type}
                                </div>
                                <div className="text-gray-500">
                                  Score: {(item.similarity * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-red-600 font-medium">Error</div>
                <div className="text-sm text-red-500">{parsed.error}</div>
              </div>
            )}
          </div>
        );
      }
      
      // Add a more detailed JSON view for debugging
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">JSON Data</span>
          </div>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-gray-100 p-3 rounded">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return content;
    }
  };

  const getAgentName = (agentId: string) => {
    switch (agentId) {
      case ASSISTANT_1_ID:
        return 'Assistant 1';
      case 'SQL_DIRECT':
        return 'SQL Direct Query';
      case 'user':
        return 'User';
      case 'system':
        return 'System';
      default:
        return 'Unknown Agent';
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'query':
        return 'bg-blue-50';
      case 'response':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getMessageIcon = (fromAgent: string, type: string) => {
    if (fromAgent === 'user') {
      return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
    if (type === 'query' && (fromAgent === 'SQL_DIRECT')) {
      return <Database className="w-4 h-4 text-indigo-500" />;
    }
    return <Bot className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="w-96 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Agent Communication</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Full conversation flow between agents</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {agentMessages.map((msg) => (
            <div
              key={getUniqueKey(msg)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                {getMessageIcon(msg.fromAgent, msg.type)}
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-medium">
                    {getAgentName(msg.fromAgent)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {getAgentName(msg.toAgent)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className={`${getMessageColor(msg.type)} rounded-md p-3 overflow-hidden`}>
                <div className="font-medium text-xs text-gray-500 mb-1">
                  {msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}:
                </div>
                <div className="text-xs overflow-x-auto">
                  {formatContent(msg.content, msg.type)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}