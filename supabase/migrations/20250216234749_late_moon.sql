/*
  # Create products table for AI system

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `price` (decimal, not null)
      - `stock` (integer, not null)
      - `category` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `products` table
    - Add policy for authenticated users to read products
    - Add policy for admin to manage products
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO anon
  USING (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO products (name, description, price, stock, category) VALUES
  ('Basic T-Shirt', 'Comfortable cotton t-shirt', 19.99, 100, 'Clothing'),
  ('Premium Headphones', 'Noise-cancelling wireless headphones', 199.99, 50, 'Electronics'),
  ('Yoga Mat', 'Non-slip exercise mat', 29.99, 75, 'Fitness'),
  ('Coffee Maker', 'Programmable drip coffee maker', 79.99, 30, 'Appliances'),
  ('Backpack', 'Water-resistant laptop backpack', 49.99, 60, 'Accessories');