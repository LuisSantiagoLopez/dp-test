import { supabase } from './supabase';

export type LogType = 'error' | 'info' | 'sql' | 'agent';

export interface SystemLog {
  id: string;
  type: LogType;
  source: string;
  message: string;
  details?: any;
  created_at: string;
}

export async function createLog(
  type: LogType,
  source: string,
  message: string,
  details?: any
) {
  const { data, error } = await supabase
    .from('system_logs')
    .insert([
      { type, source, message, details }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLogs() {
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Subscribe to real-time log updates
export function subscribeToLogs(callback: (log: SystemLog) => void) {
  return supabase
    .channel('system_logs')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'system_logs' },
      (payload) => callback(payload.new as SystemLog)
    )
    .subscribe();
}