/*
  # Fix similarity type in search_ingredients_v2 function
  
  1. Changes
    - Update similarity column type from float to double precision
    - Maintain all existing functionality
    - Fix type mismatch error in function result
  
  2. Security
    - Maintains existing security model
    - Function remains SECURITY DEFINER
    - Accessible to anon role
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS search_ingredients_v2(text, float);

-- Recreate the function with correct types
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
      p.division,
      p.grupo,
      p.clase,
      p.subclase,
      MAX(similarity(normalize_text(p.nombre_generico), sw.word))::double precision as similarity
    FROM price_data p
    CROSS JOIN search_words sw
    WHERE 
      normalize_text(p.nombre_generico) % sw.word
      OR normalize_text(p.nombre_generico) ILIKE '%' || sw.word || '%'
    GROUP BY 
      p.nombre_generico,
      p.precio_promedio,
      p.unidad,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_ingredients_v2 TO anon;