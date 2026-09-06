UPDATE feed_links SET last_sync_status = 'ok', last_sync_total = 624, last_sync_updated = 624, last_synced_at = NOW() WHERE name = 'Николай 1';
UPDATE feed_links SET last_sync_status = 'empty', last_sync_total = 0, last_synced_at = NOW() WHERE name = 'Граф Толстой';
