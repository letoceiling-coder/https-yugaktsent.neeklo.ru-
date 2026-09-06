UPDATE site_settings SET value = 'ЮгАкцент', updated_at = NOW() WHERE key = 'company_name';
UPDATE site_settings SET value = 'ЮгАкцент — новостройки Анапы', updated_at = NOW() WHERE key = 'site_title';
UPDATE site_settings SET value = 'Агентство недвижимости', updated_at = NOW() WHERE key = 'site_tagline';
UPDATE site_settings SET value = '/logo-yug-aktsent.png', updated_at = NOW() WHERE key = 'site_logo_url';
INSERT INTO site_settings (key, value, group_name, label, field_type, sort_order, created_at, updated_at)
SELECT 'site_logo_url', '/logo-yug-aktsent.png', 'company', 'Logo', 'IMAGE', 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'site_logo_url');
