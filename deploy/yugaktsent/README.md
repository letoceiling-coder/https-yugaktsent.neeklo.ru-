# ЮгАкцент — деплой сайта yugaktsent.neeklo.ru

Деплой на `yugaktsent.neeklo.ru` (сервер `212.67.9.173`).

## Особенности

- Каталог: `/var/www/yugaktsent-lg`
- БД PostgreSQL: `yugaktsent_lg`
- API порт **3025** (PM2: `yugaktsent-lg-api`)
- TrendAgent **отключён**
- Profitbase XML → PM2 `yugaktsent-profitbase-sync`

## Установка

```bash
ssh root@212.67.9.173
export DEPLOY_ROOT=/var/www/yugaktsent-lg
bash deploy/yugaktsent/bootstrap-server.sh
```

## Обновление

```bash
cd /var/www/yugaktsent-lg && git pull --ff-only origin main && bash deploy/yugaktsent/deploy-full.sh
```

## Остановить старый стек

```bash
pm2 stop yugaktsent-content yugaktsent-feed-importer yugaktsent-lead-relay && pm2 save
```
