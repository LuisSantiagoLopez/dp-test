/*
  # Add agent threads support

  1. New Tables
    - `agent_threads`
      - `id` (uuid, primary key)
      - `user_thread_id` (text, references the user's thread)
      - `agent_thread_id` (text, the thread ID for agent communication)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `agent_threads` table
    - Add policy for public read access
*/

CREATE TABLE IF NOT EXISTS agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_thread_id text NOT NULL,
  agent_thread_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agent threads"
  ON agent_threads
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert agent threads"
  ON agent_threads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agent_threads_user_thread ON agent_threads(user_thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_threads_agent_thread ON agent_threads(agent_thread_id);