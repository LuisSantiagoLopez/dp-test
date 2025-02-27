-- Drop and recreate the search function with improved response handling
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
  WITH 
    search_tokens AS MATERIALIZED (
      SELECT unnest AS word
      FROM unnest(string_to_array(normalized_terms, ',')) AS word
      WHERE length(trim(word)) >= 2
    ),
    expanded_tokens AS MATERIALIZED (
      SELECT 
        trim(word) as original,
        ARRAY[
          trim(word),
          trim(word) || 's',
          regexp_replace(trim(word), 's$', '')
        ] as variations
      FROM search_tokens
    ),
    flattened_tokens AS MATERIALIZED (
      SELECT DISTINCT trim(unnest(variations)) as word
      FROM expanded_tokens
      WHERE length(trim(unnest(variations))) >= 2
    ),
    exact_matches AS MATERIALIZED (
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'exact_match' as match_type,
        1.0::double precision as similarity,
        ft.word as search_token
      FROM price_data p
      CROSS JOIN flattened_tokens ft
      WHERE lower(unaccent(p.nombre_generico)) = lower(unaccent(ft.word))
      LIMIT 5
    ),
    partial_matches AS MATERIALIZED (
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'partial_match' as match_type,
        0.8::double precision as similarity,
        ft.word as search_token
      FROM price_data p
      CROSS JOIN flattened_tokens ft
      WHERE lower(unaccent(p.nombre_generico)) LIKE '%' || lower(unaccent(ft.word)) || '%'
      AND p.nombre_generico NOT IN (SELECT nombre_generico FROM exact_matches)
      LIMIT 10
    ),
    fuzzy_matches AS MATERIALIZED (
      SELECT 
        p.nombre_generico,
        p.precio_promedio,
        p.unidad,
        p.division,
        p.grupo,
        p.clase,
        p.subclase,
        'fuzzy_match' as match_type,
        similarity(lower(unaccent(p.nombre_generico)), lower(unaccent(ft.word)))::double precision as similarity,
        ft.word as search_token
      FROM price_data p
      CROSS JOIN flattened_tokens ft
      WHERE 
        similarity(lower(unaccent(p.nombre_generico)), lower(unaccent(ft.word))) > similarity_threshold
        AND p.nombre_generico NOT IN (
          SELECT nombre_generico FROM exact_matches
          UNION
          SELECT nombre_generico FROM partial_matches
        )
      LIMIT 10
    )
    SELECT DISTINCT ON (cr.search_token, cr.nombre_generico)
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
    FROM (
      SELECT * FROM exact_matches
      UNION ALL
      SELECT * FROM partial_matches
      UNION ALL
      SELECT * FROM fuzzy_matches
    ) cr
    WHERE cr.similarity > similarity_threshold
    ORDER BY 
      cr.search_token,
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