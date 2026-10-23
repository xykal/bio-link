#!/usr/bin/env bash
# Optimasi PNG emulator -> WebP kecil, lalu commit ke public/shots/.
set -uo pipefail

RAW="raw-shots"
OUT="public/shots"
mkdir -p "$OUT"

# ImageMagick belum tentu ada di runner -> pasang kalau perlu.
if ! command -v convert >/dev/null 2>&1; then
  echo "Memasang ImageMagick…"
  sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick webp
fi

shopt -s nullglob
files=("$RAW"/*.png)
if [ ${#files[@]} -eq 0 ]; then
  echo "Tidak ada screenshot — dilewati."
  exit 0
fi

for f in "${files[@]}"; do
  base=$(basename "$f" .png)
  # 720px lebar: cukup tajam untuk kartu & hero, tetap kecil (~60-120 KB)
  convert "$f" -resize 720x -strip -quality 80 -define webp:method=6 "$OUT/$base.webp"
  echo "$(du -h "$OUT/$base.webp" | cut -f1)  $OUT/$base.webp"
done

git config user.name "xykal"
git config user.email "xykal@users.noreply.github.com"

if git diff --quiet -- "$OUT"; then
  echo "Tidak ada perubahan screenshot."
  exit 0
fi

git add "$OUT"
git commit -m "shots: screenshot dari emulator Android (GitHub Actions)"

# push dengan retry (deploy lain mungkin sedang jalan)
for i in 1 2 3; do
  git pull --rebase --quiet origin main || true
  if git push --quiet origin HEAD:main; then
    echo "Screenshot ter-commit & ter-push."
    exit 0
  fi
  echo "push gagal (percobaan $i), coba lagi…"
  sleep 5
done
echo "!! gagal push, screenshot tetap tersedia sebagai artifact."
exit 0
