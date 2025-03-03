-- Drop and recreate the search function with fixed syntax
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
  search_start timestamp;
BEGIN
  -- Set performance parameters
  SET LOCAL statement_timeout = '5s';
  SET LOCAL work_mem = '50MB';
  SET LOCAL temp_buffers = '50MB';
  SET LOCAL enable_seqscan = off;
  SET LOCAL max_parallel_workers_per_gather = 4;
  
  search_start := clock_timestamp();
  normalized_terms := lower(unaccent(trim(search_terms)));
  
  RETURN QUERY
  WITH RECURSIVE
    search_tokens AS (
      SELECT word, row_number() OVER () as token_id
      FROM (
        SELECT unnest(string_to_array(normalized_terms, ' ')) as word
      ) w
      WHERE length(word) >= 2
    ),
    exact_matches AS (
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
      LIMIT 5
    ),
    token_matches AS (
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
      LIMIT 10
    ),
    fuzzy_matches AS (
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
      WHERE 
        similarity(lower(unaccent(p.nombre_generico)), st.word) > similarity_threshold
        AND lower(unaccent(p.nombre_generico)) NOT ILIKE '%' || st.word || '%'
      LIMIT 10
    ),
    combined_results AS (
      SELECT * FROM exact_matches
      UNION ALL
      SELECT * FROM token_matches
      UNION ALL
      SELECT * FROM fuzzy_matches
    )
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
    LIMIT 25;

EXCEPTION
  WHEN OTHERS THEN
    -- Reset all settings even if an error occurs
    RESET statement_timeout;
    RESET work_mem;
    RESET temp_buffers;
    RESET enable_seqscan;
    RESET max_parallel_workers_per_gather;
    
    -- Re-raise the error with more context
    RAISE EXCEPTION 'Search failed after % seconds: %', 
      EXTRACT(EPOCH FROM (clock_timestamp() - search_start)),
      SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_ingredients_v3 TO anon;