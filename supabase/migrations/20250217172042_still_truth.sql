/*
  # Update price_data table structure

  1. Changes
    - Remove columns:
      - año
      - mes
      - fecha_publicacion
      - codigo_ciudad
      - codigo_generico
      - consecutivo
      - estatus
      - created_at
    - Keep columns:
      - id
      - nombre_ciudad
      - division
      - grupo
      - clase
      - subclase
      - nombre_generico
      - especificacion
      - precio_promedio
      - cantidad
      - unidad

  2. Notes
    - Uses safe column removal with IF EXISTS checks
    - Preserves existing data in remaining columns
    - Maintains RLS policies and indexes
*/

DO $$ 
BEGIN
  -- Remove columns safely
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'año') THEN
    ALTER TABLE price_data DROP COLUMN año;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'mes') THEN
    ALTER TABLE price_data DROP COLUMN mes;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'fecha_publicacion') THEN
    ALTER TABLE price_data DROP COLUMN fecha_publicacion;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'codigo_ciudad') THEN
    ALTER TABLE price_data DROP COLUMN codigo_ciudad;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'codigo_generico') THEN
    ALTER TABLE price_data DROP COLUMN codigo_generico;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'consecutivo') THEN
    ALTER TABLE price_data DROP COLUMN consecutivo;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'estatus') THEN
    ALTER TABLE price_data DROP COLUMN estatus;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_data' AND column_name = 'created_at') THEN
    ALTER TABLE price_data DROP COLUMN created_at;
  END IF;
END $$;