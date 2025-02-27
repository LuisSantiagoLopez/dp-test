import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: string;
  name: string;
  status: 'completed' | 'pending' | 'failed' | 'in-progress';
  description: string;
}

const systemChecklist: ChecklistItem[] = [
  {
    id: 'chat-1',
    category: 'Chat Interface',
    name: 'Message Threading',
    status: 'completed',
    description: 'Messages are properly threaded and displayed in chronological order'
  },
  {
    id: 'chat-2',
    category: 'Chat Interface',
    name: 'Real-time Updates',
    status: 'completed',
    description: 'Messages appear in real-time as they are processed'
  },
  {
    id: 'chat-3',
    category: 'Chat Interface',
    name: 'Error Handling',
    status: 'completed',
    description: 'Errors are properly caught and displayed to the user'
  },
  {
    id: 'agent-1',
    category: 'Agent System',
    name: 'Main Agent (Assistant 1)',
    status: 'completed',
    description: 'Primary assistant handles user queries and delegates tasks'
  },
  {
    id: 'agent-2',
    category: 'Agent System',
    name: 'SQL Agent (Assistant 2)',
    status: 'completed',
    description: 'SQL assistant processes database queries and returns results'
  },
  {
    id: 'logging-1',
    category: 'Logging System',
    name: 'SQL Query Logging',
    status: 'completed',
    description: 'Database queries are logged with details and timestamps'
  },
  {
    id: 'logging-2',
    category: 'Logging System',
    name: 'Real-time Log Updates',
    status: 'completed',
    description: 'Logs update in real-time via Supabase subscription'
  },
  {
    id: 'logging-3',
    category: 'Logging System',
    name: 'Error Logging',
    status: 'completed',
    description: 'System errors are properly logged and displayed'
  },
  {
    id: 'security-1',
    category: 'Security',
    name: 'Phone Validation',
    status: 'in-progress',
    description: 'Validate phone numbers before creating threads'
  },
  {
    id: 'security-2',
    category: 'Security',
    name: 'Rate Limiting',
    status: 'pending',
    description: 'Implement rate limiting for API calls'
  },
  {
    id: 'performance-1',
    category: 'Performance',
    name: 'Message Caching',
    status: 'pending',
    description: 'Cache messages to improve load times'
  },
  {
    id: 'performance-2',
    category: 'Performance',
    name: 'Query Optimization',
    status: 'in-progress',
    description: 'Optimize database queries for better performance'
  }
];

export function SystemChecklist() {
  const categories = [...new Set(systemChecklist.map(item => item.category))];

  const getStatusIcon = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="w-96 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold">System Status</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time system component status</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {categories.map(category => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">{category}</h3>
            <div className="space-y-3">
              {systemChecklist
                .filter(item => item.category === category)
                .map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-3"
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">
                            {item.name}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'failed' ? 'bg-red-100 text-red-700' :
                            item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}