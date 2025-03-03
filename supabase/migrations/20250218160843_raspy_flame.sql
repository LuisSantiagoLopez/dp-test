/*
  # Add performance indexes for search function

  1. New Indexes
    - GIN index for trigram search on nombre_generico
    - B-tree index for exact matches on nombre_generico
    
  2. Performance Impact
    - Faster text search operations
    - Improved exact match lookups
    - Better query plan optimization
*/

-- Create GIN index for trigram search
CREATE INDEX IF NOT EXISTS idx_price_data_nombre_generico_gin 
ON price_data 
USING gin (nombre_generico gin_trgm_ops);

-- Create B-tree index for exact matches
CREATE INDEX IF NOT EXISTS idx_price_data_nombre_generico_btree
ON price_data (nombre_generico);