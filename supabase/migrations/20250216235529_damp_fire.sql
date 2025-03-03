/*
  # Create price data table for historical price information

  1. New Tables
    - `price_data`
      - `id` (uuid, primary key)
      - `año` (integer, not null) - Year
      - `mes` (integer, not null) - Month
      - `fecha_publicacion` (date, not null) - Publication date
      - `codigo_ciudad` (text, not null) - City code
      - `nombre_ciudad` (text, not null) - City name
      - `division` (text, not null) - Division
      - `grupo` (text, not null) - Group
      - `clase` (text, not null) - Class
      - `subclase` (text, not null) - Subclass
      - `codigo_generico` (text, not null) - Generic code
      - `nombre_generico` (text, not null) - Generic name
      - `consecutivo` (integer, not null) - Consecutive number
      - `especificacion` (text) - Specification
      - `precio_promedio` (decimal, not null) - Average price
      - `cantidad` (decimal, not null) - Quantity
      - `unidad` (text, not null) - Unit
      - `estatus` (text, not null) - Status
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `price_data` table
    - Add policy for public read access
    
  3. Indexes
    - Add indexes for frequently queried columns
*/

CREATE TABLE IF NOT EXISTS price_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  año integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_publicacion date NOT NULL,
  codigo_ciudad text NOT NULL,
  nombre_ciudad text NOT NULL,
  division text NOT NULL,
  grupo text NOT NULL,
  clase text NOT NULL,
  subclase text NOT NULL,
  codigo_generico text NOT NULL,
  nombre_generico text NOT NULL,
  consecutivo integer NOT NULL,
  especificacion text,
  precio_promedio decimal NOT NULL,
  cantidad decimal NOT NULL,
  unidad text NOT NULL,
  estatus text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE price_data ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can read price data"
  ON price_data
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_price_data_fecha ON price_data(fecha_publicacion);
CREATE INDEX IF NOT EXISTS idx_price_data_ciudad ON price_data(codigo_ciudad, nombre_ciudad);
CREATE INDEX IF NOT EXISTS idx_price_data_producto ON price_data(codigo_generico, nombre_generico);
CREATE INDEX IF NOT EXISTS idx_price_data_categoria ON price_data(division, grupo, clase, subclase);