#!/usr/bin/env node
/**
 * Разовый проход по уже загруженным изображениям: приводит их к веб-размеру.
 *
 * Работает через системные утилиты (ImageMagick / cwebp), npm-зависимостей не требует.
 * Файл перезаписывается только если новый вариант заметно меньше — иначе остаётся как был.
 *
 *   node optimize-uploads.mjs --dir /srv/yugaktsent-lg/uploads --dry-run
 *   node optimize-uploads.mjs --dir /srv/yugaktsent-lg/uploads --min-kb 300 --limit 500
 *
 * Флаги:
 *   --dir       корень с файлами (обязателен)
 *   --dry-run   ничего не писать, только посчитать
 *   --min-kb    не трогать файлы меньше этого размера (по умолчанию 300)
 *   --max-side  максимальная сторона в пикселях (по умолчанию 1920)
 *   --limit     обработать не более N файлов за запуск
 *   --log       файл журнала (по умолчанию optimize-uploads.log рядом с запуском)
 */
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
/** ImageMagick без ограничений съедает память целиком — на живом сервере это недопустимо */
const RUN_ENV = {
  ...process.env,
  MAGICK_MEMORY_LIMIT: '256MB',
  MAGICK_MAP_LIMIT: '512MB',
  MAGICK_THREAD_LIMIT: '1',
};
const run = (cmd, args) => execFileAsync(cmd, args, { env: RUN_ENV, maxBuffer: 8 * 1024 * 1024 });

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const ROOT = arg('dir');
const DRY = Boolean(arg('dry-run', false));
const MIN_BYTES = Number(arg('min-kb', 300)) * 1024;
const MAX_SIDE = Number(arg('max-side', 1920));
const LIMIT = Number(arg('limit', 0)) || Infinity;
const LOG_PATH = arg('log', 'optimize-uploads.log');
/** Меньше этого выигрыша не перезаписываем — качество терять незачем */
const MIN_GAIN = 0.9;

if (!ROOT) {
  console.error('Укажите --dir с корнем загрузок');
  process.exit(1);
}

const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(entry.name).toLowerCase())) yield p;
  }
}

async function optimize(file) {
  const ext = path.extname(file).toLowerCase();
  const tmp = `${file}.opt${ext}`;
  if (ext === '.webp') {
    await run('convert', [file, '-resize', `${MAX_SIDE}x${MAX_SIDE}>`, '-quality', '82', tmp]);
  } else if (ext === '.png') {
    // Тяжёлые PNG — это фотографии и рендеры, сохранённые без палитры.
    // pngquant даёт около 70 % выигрыша, визуально разницы нет.
    await run('convert', [file, '-resize', `${MAX_SIDE}x${MAX_SIDE}>`, '-strip', tmp]);
    try {
      await run('pngquant', ['--quality=65-90', '--speed', '3', '--force', '--output', tmp, tmp]);
    } catch {
      // pngquant не установлен или не смог уложиться в качество — остаётся вариант ImageMagick
    }
  } else {
    await run('convert', [
      file, '-auto-orient', '-resize', `${MAX_SIDE}x${MAX_SIDE}>`,
      '-strip', '-interlace', 'Plane', '-quality', '82', tmp,
    ]);
  }
  return tmp;
}

const stats = { seen: 0, processed: 0, skipped: 0, failed: 0, before: 0, after: 0, resumed: 0 };
const logLines = [];

/** Прогон долгий и может прерваться — при перезапуске не переделываем сделанное. */
const done = new Set();
try {
  const prev = await fs.readFile(LOG_PATH, 'utf8');
  for (const line of prev.split('\n')) {
    const [file] = line.split('\t');
    if (file && file.startsWith('/')) done.add(file);
  }
  if (done.size) console.log(`в журнале уже ${done.size} файлов — они будут пропущены`);
} catch {
  // журнала нет — первый запуск
}

for await (const file of walk(ROOT)) {
  if (stats.processed >= LIMIT) break;
  stats.seen++;
  if (done.has(file)) {
    stats.resumed++;
    continue;
  }
  let size;
  try {
    size = (await fs.stat(file)).size;
  } catch {
    continue;
  }
  if (size < MIN_BYTES) {
    stats.skipped++;
    continue;
  }

  let tmp;
  try {
    tmp = await optimize(file);
    const newSize = (await fs.stat(tmp)).size;
    if (newSize > size * MIN_GAIN) {
      await fs.unlink(tmp);
      stats.skipped++;
      continue;
    }
    stats.before += size;
    stats.after += newSize;
    stats.processed++;
    logLines.push(`${file}\t${size}\t${newSize}`);
    if (DRY) {
      await fs.unlink(tmp);
    } else {
      await fs.rename(tmp, file);
    }
    if (stats.processed % 200 === 0) {
      console.log(
        `обработано ${stats.processed}: ${(stats.before / 1048576).toFixed(0)} МБ → ${(stats.after / 1048576).toFixed(0)} МБ`,
      );
      // Журнал пишем по ходу дела: длинный прогон не должен терять историю при обрыве
      if (logLines.length) {
        await fs.appendFile(LOG_PATH, logLines.join('\n') + '\n');
        logLines.length = 0;
      }
    }
  } catch (e) {
    stats.failed++;
    if (tmp) await fs.unlink(tmp).catch(() => {});
    logLines.push(`ОШИБКА\t${file}\t${e.message}`);
  }
}

if (logLines.length) await fs.appendFile(LOG_PATH, logLines.join('\n') + '\n');

const saved = (stats.before - stats.after) / 1048576;
console.log(
  [
    DRY ? '=== ПРОБНЫЙ ПРОГОН (файлы не менялись) ===' : '=== ГОТОВО ===',
    `просмотрено файлов: ${stats.seen}`,
    `ужато: ${stats.processed}`,
    `пропущено (мелкие или без выигрыша): ${stats.skipped}`,
    `пропущено как уже обработанные: ${stats.resumed}`,
    `ошибок: ${stats.failed}`,
    `было: ${(stats.before / 1048576).toFixed(0)} МБ → стало: ${(stats.after / 1048576).toFixed(0)} МБ`,
    `экономия: ${saved.toFixed(0)} МБ`,
    `журнал: ${LOG_PATH}`,
  ].join('\n'),
);
