/*
  # Update search functions to exclude city information
  
  1. Changes
    - Create new search_ingredients_v2 function that excludes city information
    - Function returns same fuzzy search results but without city column
    - Maintains all other functionality including similarity matching
  
  2. Security
    - Maintains existing security model
    - Function is SECURITY DEFINER
    - Accessible to anon role
*/

-- Create updated search function without city information
CREATE OR REPLACE FUNCTION search_ingredients_v2(
  search_terms text,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  nombre_generico text,
  precio_promedio decimal,
  unidad text,
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