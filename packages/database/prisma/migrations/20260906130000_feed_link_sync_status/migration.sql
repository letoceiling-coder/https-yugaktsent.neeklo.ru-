ALTER TABLE "feed_links"
  ADD COLUMN "last_sync_status" TEXT,
  ADD COLUMN "last_sync_total" INTEGER,
  ADD COLUMN "last_sync_created" INTEGER,
  ADD COLUMN "last_sync_updated" INTEGER,
  ADD COLUMN "last_sync_errors" INTEGER;
