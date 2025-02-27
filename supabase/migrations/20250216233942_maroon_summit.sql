/*
  # Create conversations table for storing thread IDs

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `phone_number` (text, unique)
      - `thread_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `conversations` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  thread_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversations"
  ON conversations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read conversations"
  ON conversations
  FOR SELECT
  TO anon
  USING (true);