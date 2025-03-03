/*
  # Enable unaccent extension and fix search function
  
  1. Changes
    - Enable unaccent extension
    - Update search_ingredients_v2 function to handle text normalization properly
  
  2. Security
    - Maintains existing security model
    - Function remains SECURITY DEFINER
    - Accessible to anon role
*/

-- Enable the unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Drop the existing function
DROP FUNCTION IF EXISTS search_ingredients_v2(text, double precision);

-- Recreate the function with proper text normalization
CREATE OR REPLACE FUNCTION search_ingredients_v2(
  search_terms text,
  similarity_threshold double precision DEFAULT 0.3
)
RETURNS TABLE (
  nombre_generico text,
  precio_promedio decimal,
  unidad text,
  division text,
  grupo text,
  clase text,
  subclase text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized_terms text;
BEGIN
  -- Normalize search terms
  normalized_terms := lower(unaccent(trim(search_terms)));
  
  RETURN QUERY
  WITH search_words AS (
    SELECT unnest(string_to_array(normalized_terms, ' ')) as word
  ),
  ranked_results AS (
    SELECT DISTINCT ON (p.nombre_generico)
      p.nombre_generico,
      p.precio_promedio,
      p.unidad,
      p.division,
      p.grupo,
      p.clase,
      p.subclase,
      MAX(similarity(lower(unaccent(p.nombre_generico)), sw.word))::double precision as similarity
    FROM price_data p
    CROSS JOIN search_words sw
    WHERE 
      lower(unaccent(p.nombre_generico)) % sw.word
      OR lower(unaccent(p.nombre_generico)) ILIKE '%' || sw.word || '%'
    GROUP BY 
      p.nombre_generico,
      p.precio_promedio,
      p.unidad,
      p.division,
      p.grupo,
      p.clase,
      p.subclase
    HAVING MAX(similarity(lower(unaccent(p.nombre_generico)), sw.word)) > similarity_threshold
  )
  SELECT *
  FROM ranked_results
  ORDER BY similarity DESC, nombre_generico
  LIMIT 20;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_ingredients_v2 TO anon;