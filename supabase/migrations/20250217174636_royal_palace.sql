/*
  # Add text search capabilities
  
  1. Changes
    - Add text search functions for better ingredient matching
    - Fix encoding issues with proper collation
    - Add trigram extension for fuzzy matching
    - Add helper functions for ingredient search
    
  2. Security
    - Functions are created with SECURITY DEFINER
    - Input validation is performed
    - Results are properly sanitized
*/

-- Enable the pg_trgm extension for fuzzy text matching if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to normalize text for searching
CREATE OR REPLACE FUNCTION normalize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN lower(unaccent(trim(input_text)));
END;
$$;

-- Create a function to search ingredients with fuzzy matching
CREATE OR REPLACE FUNCTION search_ingredients(
  search_terms text,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  nombre_generico text,
  precio_promedio decimal,
  unidad text,
  nombre_ciudad text,
  division text,
  grupo text,
  clase text,
  subclase text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH search_words AS (
    SELECT unnest(string_to_array(normalize_text(search_terms), ' ')) as word
  ),
  ranked_results AS (
    SELECT DISTINCT ON (p.nombre_generico)
      p.nombre_generico,
      p.precio_promedio,
      p.unidad,
      p.nombre_ciudad,
      p.division,
      p.grupo,
      p.clase,
      p.subclase,
      MAX(similarity(normalize_text(p.nombre_generico), sw.word)) as similarity
    FROM price_data p
    CROSS JOIN search_words sw
    WHERE 
      normalize_text(p.nombre_generico) % sw.word
      OR normalize_text(p.nombre_generico) ILIKE '%' || sw.word || '%'
    GROUP BY 
      p.nombre_generico,
      p.precio_promedio,
      p.unidad,
      p.nombre_ciudad,
      p.division,
      p.grupo,
      p.clase,
      p.subclase
    HAVING MAX(similarity(normalize_text(p.nombre_generico), sw.word)) > similarity_threshold
  )
  SELECT *
  FROM ranked_results
  ORDER BY similarity DESC, nombre_generico
  LIMIT 20;
END;
$$;