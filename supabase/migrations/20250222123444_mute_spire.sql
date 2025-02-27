-- Create the message handling edge function
CREATE OR REPLACE FUNCTION handle_message(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_text text;
  response json;
BEGIN
  -- Extract message from payload
  message_text := payload->>'message';
  
  IF message_text IS NULL OR message_text = '' THEN
    RETURN json_build_object(
      'status', 'error',
      'error', 'Message is required'
    );
  END IF;

  -- Log the incoming message
  INSERT INTO system_logs (
    type,
    source,
    message,
    details
  ) VALUES (
    'info',
    'edge_function',
    'Received message',
    json_build_object('message', message_text)
  );

  -- Process message using search_ingredients_v3
  WITH search_results AS (
    SELECT * FROM search_ingredients_v3(message_text)
  )
  SELECT json_agg(
    json_build_object(
      'nombre_generico', nombre_generico,
      'precio_promedio', precio_promedio,
      'unidad', unidad,
      'division', division,
      'grupo', grupo,
      'clase', clase,
      'subclase', subclase,
      'match_type', match_type,
      'similarity', similarity,
      'search_token', search_token
    )
  ) INTO response
  FROM search_results;

  -- Return formatted response
  RETURN json_build_object(
    'status', 'success',
    'data', response
  );
END;
$$;