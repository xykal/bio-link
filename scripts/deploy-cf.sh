#!/usr/bin/env bash
# Deploy bio-link ke Cloudflare Workers + verifikasi hasilnya.
#
# Pakai dari laptop (IP kamu sudah diizinkan token):
#   cd bio-link
#   CLOUDFLARE_API_TOKEN=xxx ./scripts/deploy-cf.sh
#
# Opsional:
#   SECRETS_FILE=/path/secrets.json   -> sekaligus upload Worker secret (wrangler secret bulk)
#   SKIP_BUILD=1                     -> pakai bundle .open-next yang sudah ada
#   DOMAIN=bio.haekal.web.id         -> domain yang dicek di akhir
set -euo pipefail

cd "$(dirname "$0")/.."

DOMAIN="${DOMAIN:-bio.haekal.web.id}"
SECRETS_FILE="${SECRETS_FILE:-}"
WORKER="bio-link"

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN belum diset."
  echo "Ambil di dash → My Profile → API Tokens (izin: Workers Scripts:Edit, D1:Edit, Workers Routes:Edit, Zone DNS:Edit)."
  exit 1
fi

say "1/5 Verifikasi token"
if ! curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    https://api.cloudflare.com/client/v4/user/tokens/verify | grep -q '"status":"active"'; then
  warn "Token tidak valid dari mesin ini. Kalau di dashboard token aktif, kemungkinan"
  warn "token memakai Client IP Address Filtering yang mengunci IP lain (CI/sandbox)."
  exit 1
fi
echo "token aktif"

say "2/5 Upload Worker secret"
if [[ -n "$SECRETS_FILE" ]]; then
  npx wrangler secret bulk "$SECRETS_FILE"
else
  warn "SECRETS_FILE tidak diset — lewati. Set manual:"
  warn "  npx wrangler secret put ADMIN_PASSWORD"
  warn "  npx wrangler secret put SESSION_SECRET"
  warn "  npx wrangler secret put CRON_SECRET"
fi

say "3/5 Build + deploy"
if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  npx wrangler deploy
else
  npx opennextjs-cloudflare build
  npx wrangler deploy
fi

say "4/5 Verifikasi halaman"
code() { curl -s -o /dev/null -w '%{http_code}' -m 30 "$1" || echo "000"; }
echo "GET /            -> $(code "https://$DOMAIN/")"
echo "GET /api/data    -> $(code "https://$DOMAIN/api/data")"
echo "GET /admin       -> $(code "https://$DOMAIN/admin")"
curl -sI -m 30 "https://$DOMAIN/" | grep -iE '^(x-opennext|server|cf-ray):' || true

say "5/5 Info Worker"
npx wrangler deployments list --name "$WORKER" 2>/dev/null | head -20 || true

cat <<EOF

Selesai. Kalau domain belum mengarah ke Worker:
  Dashboard → Workers & Pages → $WORKER → Settings → Domains & Routes → Add custom domain → $DOMAIN
  (hapus dulu CNAME lama ke cname.vercel-dns.com di DNS zone haekal.web.id)
Di Vercel: Project → Settings → Domains → hapus $DOMAIN supaya tidak rebutan.
EOF
