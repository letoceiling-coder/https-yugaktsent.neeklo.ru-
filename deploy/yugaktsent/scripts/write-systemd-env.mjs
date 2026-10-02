#!/usr/bin/env node
/**
 * Готовит файлы окружения для systemd из того же источника, что и PM2:
 * `.env` проекта плюс значения по умолчанию из ecosystem.config.js.
 *
 * Источник правды остаётся один — дублировать настройки в юнитах нельзя,
 * они разъедутся при первой же правке .env.
 *
 * Usage: node deploy/yugaktsent/scripts/write-systemd-env.mjs [--out-dir /etc/yugaktsent]
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const ecosystemPath = resolve(here, '..', 'ecosystem.config.js');

const argv = process.argv.slice(2);
const outDirIndex = argv.indexOf('--out-dir');
const outDir = outDirIndex >= 0 ? argv[outDirIndex + 1] : '/etc/yugaktsent';

const ecosystem = require(ecosystemPath);

/**
 * systemd читает значение до конца строки и снимает обрамляющие кавычки.
 * Поэтому значение пишем как есть, но:
 *  - перевод строки внутри значения systemd не поддерживает — падаем явно;
 *  - значение, которое само начинается и кончается кавычкой, экранируем,
 *    иначе systemd срежет её и смысл изменится.
 */
function serialize(key, rawValue) {
  const value = rawValue == null ? '' : String(rawValue);
  if (value.includes('\n') || value.includes('\r')) {
    throw new Error(
      `Значение ${key} содержит перевод строки — systemd такое не принимает. Поправьте .env.`,
    );
  }
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (quoted) {
    return `${key}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `${key}=${value}`;
}

const FILES = {
  'yugaktsent-lg-api': 'api.env',
  'yugaktsent-profitbase-sync': 'profitbase-sync.env',
};

mkdirSync(outDir, { recursive: true });

let written = 0;
for (const app of ecosystem.apps) {
  const fileName = FILES[app.name];
  if (!fileName) continue;

  const lines = Object.entries(app.env ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => serialize(k, v));

  const target = join(outDir, fileName);
  writeFileSync(
    target,
    `# Сгенерировано write-systemd-env.mjs из .env проекта. Руками не править.\n${lines.join('\n')}\n`,
    'utf8',
  );
  // В файле лежат пароли и секреты — читать может только root
  chmodSync(target, 0o600);
  console.log(`${target}: ${lines.length} переменных`);
  written += 1;
}

if (written !== Object.keys(FILES).length) {
  console.error('Не все приложения найдены в ecosystem.config.js');
  process.exit(1);
}
