import React, { useState, useEffect } from 'react';
import { SystemLog } from '../lib/logging';
import { subscribeToLogs } from '../lib/logging';
import { Database, AlertCircle, Clock, ArrowRight } from 'lucide-react';

interface LogSidebarProps {
  initialLogs: SystemLog[];
}

export function LogSidebar({ initialLogs }: LogSidebarProps) {
  const [logs, setLogs] = useState<SystemLog[]>(initialLogs);

  useEffect(() => {
    const subscription = subscribeToLogs((newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter to show only SQL logs
  const sqlLogs = logs.filter((log) => log.type === 'sql');

  return (
    <div className="w-96 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">SQL Query Logs</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Real-time database query monitoring</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sqlLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Database className="w-8 h-8 mb-2" />
            <p>No SQL queries yet</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {sqlLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900">{log.source}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <time>{new Date(log.created_at).toLocaleTimeString()}</time>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{log.message}</p>

                  {log.details && (
                    <div className="mt-2 space-y-2">
                      {log.details.query && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <ArrowRight className="w-3 h-3" />
                            <span>Query</span>
                          </div>
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {log.details.query}
                          </pre>
                        </div>
                      )}
                      
                      {log.details.arguments && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <ArrowRight className="w-3 h-3" />
                            <span>Arguments</span>
                          </div>
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.details.arguments, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {log.details?.error && (
                    <div className="mt-2 bg-red-50 text-red-700 rounded-md p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Error</p>
                        <p className="text-red-600">{log.details.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}