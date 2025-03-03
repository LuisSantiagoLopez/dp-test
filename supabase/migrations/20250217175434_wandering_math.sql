CREATE OR REPLACE FUNCTION execute_sql(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    normalized_query text;
BEGIN
    -- Normalize query by removing extra whitespace and converting to lowercase
    normalized_query := lower(regexp_replace(trim(query_text), '\s+', ' ', 'g'));
    
    -- Validate that the query is a SELECT statement
    IF NOT (normalized_query ~ '^select\s+') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;

    -- Validate that it's querying the price_data table
    IF NOT (normalized_query ~ '\sfrom\s+price_data\s') THEN
        RAISE EXCEPTION 'Query must select from price_data table';
    END IF;

    -- Validate no dangerous operations
    IF normalized_query ~ '\s(delete|update|insert|truncate|drop|alter|create)\s' THEN
        RAISE EXCEPTION 'Only SELECT operations are allowed';
    END IF;

    -- Execute the query and convert results to JSON
    EXECUTE format('
        WITH query_result AS (%s)
        SELECT jsonb_agg(to_jsonb(query_result))
        FROM query_result;
    ', query_text) INTO result;

    -- Return empty array if no results
    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO anon;