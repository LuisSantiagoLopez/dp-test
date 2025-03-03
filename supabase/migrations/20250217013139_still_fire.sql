/*
  # Create logs table for system events

  1. New Tables
    - `system_logs`
      - `id` (uuid, primary key)
      - `type` (text) - Type of log (error, info, sql, agent)
      - `source` (text) - Source of the log (assistant_id, function name)
      - `message` (text) - Log message
      - `details` (jsonb) - Additional details/metadata
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `system_logs` table
    - Add policy for public read access
    - Add policy for system to insert logs
*/

CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  source text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read logs"
  ON system_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "System can insert logs"
  ON system_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);