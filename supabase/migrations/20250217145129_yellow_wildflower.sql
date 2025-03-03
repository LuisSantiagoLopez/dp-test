/*
  # Add SQL Agent Threads Table

  1. New Tables
    - `sql_agent_threads`
      - `id` (uuid, primary key)
      - `user_thread_id` (text, not null)
      - `sql_thread_id` (text, not null)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `sql_agent_threads` table
    - Add policies for read and insert access
*/

CREATE TABLE IF NOT EXISTS sql_agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_thread_id text NOT NULL,
  sql_thread_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sql_agent_threads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read sql agent threads"
  ON sql_agent_threads
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert sql agent threads"
  ON sql_agent_threads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sql_agent_threads_user_thread ON sql_agent_threads(user_thread_id);
CREATE INDEX IF NOT EXISTS idx_sql_agent_threads_sql_thread ON sql_agent_threads(sql_thread_id);