-- Feed links for Profitbase / external XML feeds (admin-managed)
CREATE TABLE "feed_links" (
    "id" SERIAL NOT NULL,
    "region_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "feed_url" TEXT NOT NULL,
    "block_name" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'profitbase',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feed_links_feed_url_key" ON "feed_links"("feed_url");
CREATE INDEX "feed_links_region_id_is_enabled_idx" ON "feed_links"("region_id", "is_enabled");

ALTER TABLE "feed_links" ADD CONSTRAINT "feed_links_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "feed_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
