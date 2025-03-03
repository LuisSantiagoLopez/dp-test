/*
  # Enhanced ingredient search function

  1. Changes
    - Add statement timeout setting
    - Optimize search with materialized CTEs
    - Add performance hints
    - Improve error handling
    - Add search token tracking

  2. Performance
    - Added result limits at each stage
    - Disabled sequential scans
    - Added GIN index for text search
    - Materialized intermediate results

  3. Security
    - Added statement timeout
    - Added proper error handling
    - Maintained RLS compatibility
*/

-- Create enhanced search function with timeout and optimization
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
  -- Set statement timeout to 10 seconds
  SET LOCAL statement_timeout = '10s';
  
  -- Normalize search terms
  normalized_terms := lower(unaccent(trim(search_terms)));
  
  -- Add index hint for performance
  SET LOCAL enable_seqscan = off;
  
  RETURN QUERY
  WITH 
    -- Split search terms into individual words
    search_tokens AS MATERIALIZED (
      SELECT word, row_number() OVER () as token_id
      FROM unnest(string_to_array(normalized_terms, ' ')) as word
      WHERE length(word) >= 2  -- Filter out single-character terms
    ),
    -- Try different search strategies with materialized results
    exact_matches AS MATERIALIZED (
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
      LIMIT 10
    ),
    token_matches AS MATERIALIZED (
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
      LIMIT 20
    ),
    fuzzy_matches AS MATERIALIZED (
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
      LIMIT 20
    ),
    combined_results AS MATERIALIZED (
      SELECT * FROM exact_matches
      UNION ALL
      SELECT * FROM token_matches
      UNION ALL
      SELECT * FROM fuzzy_matches
    )
    -- Select best matches with explicit table alias and materialized results
    SELECT DISTINCT ON (cr.nombre_generico)
      cr.nombre_generico,
      cr.precio_promedio,
      cr.unidad,
      cr.division,
      cr.grupo,
      cr.clase,
      cr.subclase,
      cr.match_type,
      cr.similarity,
      cr.search_token
    FROM combined_results cr
    WHERE cr.similarity > similarity_threshold
    ORDER BY 
      cr.nombre_generico,
      cr.similarity DESC,
      cr.match_type
    LIMIT 50;  -- Overall limit for final results

  -- Reset statement timeout and scan settings
  RESET statement_timeout;
  RESET enable_seqscan;
EXCEPTION
  WHEN OTHERS THEN
    -- Reset settings even if an error occurs
    RESET statement_timeout;
    RESET enable_seqscan;
    RAISE;
END;
$$;

-- Create index for improved search performance if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_price_data_nombre_generico_gin'
  ) THEN
    CREATE INDEX idx_price_data_nombre_generico_gin 
    ON price_data 
    USING gin (nombre_generico gin_trgm_ops);
  END IF;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_ingredients_v3 TO anon;