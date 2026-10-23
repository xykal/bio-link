#!/usr/bin/env bash
# Ambil APK x86_64 dari release GitHub (yang bisa jalan di emulator runner).
set -euo pipefail

mkdir -p apks
cd apks

fetch() {
  local name="$1" url="$2"
  echo "== $name"
  curl -sSL --retry 3 --retry-delay 2 -o "$name.apk" "$url"
  local size
  size=$(stat -c%s "$name.apk")
  echo "   $(du -h "$name.apk" | cut -f1) ($size bytes)"
  # validasi: harus arsip zip (APK) dan bukan halaman error
  if [ "$size" -lt 100000 ]; then
    echo "   !! terlalu kecil, kemungkinan gagal unduh"
    return 1
  fi
  python3 - "$name.apk" <<'PY'
import sys, zipfile
try:
    zipfile.ZipFile(sys.argv[1]).testzip()
except Exception as exc:
    print("   !! bukan APK valid:", exc)
    sys.exit(1)
PY
}

fetch appperms  "https://github.com/xykal/AppPerms/releases/download/v1.8.0/AppsPerms-1.8.0-stable-x86_64-release.apk"
fetch dlaja     "https://github.com/xykal/XyDownloader/releases/download/v1.3.5/DownloadAja-1.3.5-x86_64.apk"
fetch kilat     "https://github.com/xykal/kilat-motion/releases/download/v1.21.0/app-x86_64-release.apk"
# universal (berisi lib x86_64) — paling besar, jadi paling akhir
fetch nyawit    "https://github.com/xykal/nyawit-live/releases/download/v5.0.0/NyawitLive-v5.0.0-universal.apk"

ls -la
