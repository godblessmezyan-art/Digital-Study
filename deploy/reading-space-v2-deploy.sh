#!/bin/sh
set -eu

cd /opt/digital-study
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/opt/digital-study-backups/reading-space-v2-${timestamp}"
mkdir -p "$backup_dir"

cp .env.production "$backup_dir/.env.production"
cp database/schema.prisma "$backup_dir/schema.prisma"
cp -R apps/api/src/reading "$backup_dir/api-reading"
cp apps/web/js/reading-client.js apps/web/js/reading-space.js apps/web/js/shelf-page.js "$backup_dir/"
cp apps/web/css/reading-space.css apps/web/css/shelf.css "$backup_dir/"

docker compose -f deploy/wxhappylife.compose.yml build api web
docker compose -f deploy/wxhappylife.compose.yml run --rm api ./node_modules/.bin/prisma migrate deploy --schema database/schema.prisma
docker compose -f deploy/wxhappylife.compose.yml up -d api web

echo "Reading Space V2 deployed. Backup: $backup_dir"
