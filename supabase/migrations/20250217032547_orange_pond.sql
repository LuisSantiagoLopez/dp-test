/*
  # Add execute_sql function

  1. New Functions
    - `execute_sql`: A function that safely executes dynamic SQL queries
      - Takes a query_text parameter
      - Returns JSONB result
      
  2. Security
    - Function is restricted to SELECT statements only
    - Includes query validation
    - Returns results in JSON format
*/

CREATE OR REPLACE FUNCTION execute_sql(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Validate that the query is a SELECT statement
    IF NOT (lower(trim(query_text)) LIKE 'select%') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
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