#!/usr/bin/env bash
# Otonom şoför atama botunu tetikler. Kullanım: auto-assign.sh morning|afternoon
#
# crontab örneği (crontab -e) — saat dilimini Türkiye olarak sabitler, sunucu UTC olsa da 08:30/13:30 doğru çalışır:
#   CRON_TZ=Europe/Istanbul
#   30 8  * * 1-5 /opt/yuksekihtisas/scripts/cron/auto-assign.sh morning   >> /var/log/yiu-auto-assign.log 2>&1
#   30 13 * * 1-5 /opt/yuksekihtisas/scripts/cron/auto-assign.sh afternoon >> /var/log/yiu-auto-assign.log 2>&1
#
# Gerekenler: uygulamanın .env dosyasındaki CRON_SECRET değeri ve uygulamanın yerel adresi.
set -euo pipefail

SLOT="${1:?slot gerekli: morning veya afternoon}"
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"

# .env içinden yalnızca CRON_SECRET okunur (dosya kaynak olarak çalıştırılmaz)
CRON_SECRET="${CRON_SECRET:-$(grep -E '^CRON_SECRET=' "$APP_DIR/.env" | head -n1 | cut -d= -f2- | tr -d "\"'\r")}"
[ -n "$CRON_SECRET" ] || { echo "CRON_SECRET bulunamadı"; exit 1; }

echo "[$(date -Is)] auto-assign $SLOT"
curl --silent --show-error --fail --max-time 120 \
  -X POST "$APP_URL/api/cron/auto-assign?slot=$SLOT" \
  -H "Authorization: Bearer $CRON_SECRET"
echo
