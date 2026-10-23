#!/usr/bin/env bash
# Saklar halaman darurat: alihkan bio.haekal.web.id antara Worker (aplikasi
# penuh) dan Cloudflare Pages (halaman statis) saat kuota Workers habis.
#
#   bash scripts/emergency-static.sh on    -> pakai halaman statis
#   bash scripts/emergency-static.sh off   -> balik ke Worker bio-link
#
# Butuh: CLOUDFLARE_API_TOKEN (scope Workers Scripts + Pages + DNS),
#        CLOUDFLARE_ACCOUNT_ID.
set -euo pipefail

ACCOUNT="${CLOUDFLARE_ACCOUNT_ID:-a678fee6e0a026ccd2fd978cdf07806a}"
ZONE="${CF_ZONE_ID:-af6824395ac80af0bad00515072a1708}"
HOST="bio.haekal.web.id"
PAGES_PROJECT="bio-link-emergency"
WORKER="bio-link"
API="https://api.cloudflare.com/client/v4"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN belum diset}"
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")

dns_id() {
  curl -s "${AUTH[@]}" "$API/zones/$ZONE/dns_records?name=$HOST" \
    | python3 -c "import json,sys;r=json.load(sys.stdin).get('result') or [];print(r[0]['id'] if r else '')"
}

worker_domain_id() {
  curl -s "${AUTH[@]}" "$API/accounts/$ACCOUNT/workers/domains" \
    | python3 -c "
import json,sys
for d in json.load(sys.stdin).get('result') or []:
    if d.get('hostname')=='$HOST': print(d['id']); break
else: print('')"
}

case "${1:-}" in
  on)
    echo "== 1/3 lepas domain dari Worker $WORKER =="
    id=$(worker_domain_id)
    [ -n "$id" ] && curl -s -o /dev/null -w "   delete worker domain: %{http_code}\n" \
      -X DELETE "${AUTH[@]}" "$API/accounts/$ACCOUNT/workers/domains/$id"

    echo "== 2/3 deploy halaman statis ke Pages =="
    npx --yes wrangler@4 pages deploy emergency-site \
      --project-name "$PAGES_PROJECT" --branch main --commit-dirty=true | tail -3

    echo "== 3/3 sambungkan domain =="
    curl -s -o /dev/null -w "   attach pages domain: %{http_code}\n" \
      -X POST "${AUTH[@]}" -d "{\"name\":\"$HOST\"}" \
      "$API/accounts/$ACCOUNT/pages/projects/$PAGES_PROJECT/domains"
    id=$(dns_id)
    if [ -z "$id" ]; then
      curl -s -o /dev/null -w "   create CNAME: %{http_code}\n" -X POST "${AUTH[@]}" \
        -d "{\"type\":\"CNAME\",\"name\":\"bio\",\"content\":\"$PAGES_PROJECT.pages.dev\",\"proxied\":true,\"ttl\":1}" \
        "$API/zones/$ZONE/dns_records"
    else
      curl -s -o /dev/null -w "   update CNAME: %{http_code}\n" -X PATCH "${AUTH[@]}" \
        -d "{\"type\":\"CNAME\",\"name\":\"bio\",\"content\":\"$PAGES_PROJECT.pages.dev\",\"proxied\":true}" \
        "$API/zones/$ZONE/dns_records/$id"
    fi
    echo "   Tunggu 1-2 menit sampai sertifikat Pages siap."
    ;;

  off)
    echo "== 1/3 lepas domain dari Pages =="
    curl -s -o /dev/null -w "   delete pages domain: %{http_code}\n" \
      -X DELETE "${AUTH[@]}" "$API/accounts/$ACCOUNT/pages/projects/$PAGES_PROJECT/domains/$HOST"

    echo "== 2/3 hapus CNAME sementara =="
    id=$(dns_id)
    [ -n "$id" ] && curl -s -o /dev/null -w "   delete dns: %{http_code}\n" \
      -X DELETE "${AUTH[@]}" "$API/zones/$ZONE/dns_records/$id"

    echo "== 3/3 deploy Worker $WORKER (route di wrangler.jsonc memasang domain lagi) =="
    export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"
    npx opennextjs-cloudflare build >/dev/null
    npx wrangler deploy | tail -8
    ;;

  *)
    echo "pakai: bash scripts/emergency-static.sh on|off" >&2
    exit 2
    ;;
esac
