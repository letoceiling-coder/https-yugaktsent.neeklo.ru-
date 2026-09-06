-- Speed up block page aggregates and chessboard filters
CREATE INDEX IF NOT EXISTS listings_block_public_catalog_idx
  ON listings (block_id, status, kind, is_published)
  WHERE is_published = true;
