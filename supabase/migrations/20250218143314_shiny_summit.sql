-- Drop and recreate the search function with fixed column references
CREATE OR REPLACE FUNCTION search_ingredients_v3(
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
  match_type text,
  similarity double precision,
  search_token text
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
  WITH 
    -- Split search terms into individual words
    search_tokens AS (
      SELECT word, row_number() OVER () as token_id
      FROM unnest(string_to_array(normalized_terms, ' ')) as word
    ),
    -- Try different search strategies
    search_attempts AS (
      -- Strategy 1: Exact phrase match (highest priority)
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'exact_phrase' as match_type,
        1.0::double precision as similarity,
        normalized_terms as search_token
      FROM price_data p
      WHERE lower(unaccent(p.nombre_generico)) ILIKE '%' || normalized_terms || '%'
      
      UNION ALL
      
      -- Strategy 2: Individual token matches (medium priority)
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'token_match' as match_type,
        0.8::double precision * similarity(lower(unaccent(p.nombre_generico)), st.word) as similarity,
        st.word as search_token
      FROM price_data p
      CROSS JOIN search_tokens st
      WHERE lower(unaccent(p.nombre_generico)) ILIKE '%' || st.word || '%'
      
      UNION ALL
      
      -- Strategy 3: Fuzzy matching (lowest priority)
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'fuzzy_match' as match_type,
        0.6::double precision * similarity(lower(unaccent(p.nombre_generico)), st.word) as similarity,
        st.word as search_token
      FROM price_data p
      CROSS JOIN search_tokens st
      WHERE similarity(lower(unaccent(p.nombre_generico)), st.word) > similarity_threshold
        AND lower(unaccent(p.nombre_generico)) NOT ILIKE '%' || st.word || '%'
    )
    -- Select best matches with explicit table alias
    SELECT DISTINCT ON (sa.nombre_generico)
      sa.nombre_generico,
      sa.precio_promedio,
      sa.unidad,
      sa.division,
      sa.grupo,
      sa.clase,
      sa.subclase,
      sa.match_type,
      sa.similarity,
      sa.search_token
    FROM search_attempts sa
    WHERE sa.similarity > similarity_threshold
    ORDER BY 
      sa.nombre_generico,
      sa.similarity DESC,
      sa.match_type;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_ingredients_v3 TO anon;