#!/usr/bin/env bash
# Dijalankan DI DALAM emulator runner (adb tersedia).
# Untuk tiap APK: install -> launch -> tangkap beberapa layar berbeda.
set -uo pipefail

RAW="raw-shots"
mkdir -p "$RAW"

echo "== perangkat =="
adb devices
adb shell getprop ro.build.version.release

# --- matikan dialog error/ANR sistem (penyebab "Pixel Launcher isn't responding")
adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put global anr_show_background 0 || true
adb shell am force-stop com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true

# --- rapikan & bekukan status bar
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true
adb shell settings put system screen_off_timeout 1800000 || true
adb shell settings put global sysui_demo_allowed 1 || true
adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null 2>&1 || true
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200 >/dev/null 2>&1 || true
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null 2>&1 || true
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 >/dev/null 2>&1 || true
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null 2>&1 || true

seen_hash() {
  local file="$1"
  local h
  h=$(md5sum "$file" 2>/dev/null | cut -d' ' -f1)
  if [ -f "$RAW/.hashes" ] && grep -qx "$h" "$RAW/.hashes" 2>/dev/null; then
    return 0 # sudah ada
  fi
  echo "$h" >> "$RAW/.hashes"
  return 1
}

shot() {
  local name="$1" tmp="/tmp/_shot.png"
  adb exec-out screencap -p > "$tmp" 2>/dev/null
  local size
  size=$(stat -c%s "$tmp" 2>/dev/null || echo 0)
  if [ "$size" -lt 20000 ]; then
    echo "   !! $name: screenshot kecil ($size B), dilewati"
    return 0
  fi
  if seen_hash "$tmp"; then
    echo "   - $name: identik dengan sebelumnya, dilewati"
    return 0
  fi
  mv "$tmp" "$RAW/$name.png"
  echo "   + $name ($size bytes)"
}

# Tap elemen berdasarkan teksnya (pakai uiautomator, bukan koordinat tebak-tebakan)
tap_text() {
  local needle="$1"
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || return 1
  adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1 || return 1
  local coords
  coords=$(python3 - "$needle" <<'PY'
import re, sys
needle = sys.argv[1].lower()
xml = open('/tmp/ui.xml', encoding='utf-8', errors='ignore').read()
best = None
for m in re.finditer(r'<node[^>]*>', xml):
    tag = m.group(0)
    t = re.search(r'text="([^"]*)"', tag)
    d = re.search(r'content-desc="([^"]*)"', tag)
    label = ((t.group(1) if t else '') + ' ' + (d.group(1) if d else '')).strip().lower()
    if needle not in label or not label:
        continue
    b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', tag)
    if not b:
        continue
    x1, y1, x2, y2 = map(int, b.groups())
    if x2 - x1 < 8 or y2 - y1 < 8:
        continue
    best = ((x1 + x2) // 2, (y1 + y2) // 2)
    break
if best:
    print(best[0], best[1])
PY
)
  [ -z "$coords" ] && return 1
  echo "   tap '$needle' @ $coords"
  adb shell input tap $coords >/dev/null 2>&1
  sleep 2
  return 0
}

capture_app() {
  local name="$1" apk="$2"
  echo "== $name =="

  local before after pkg
  before=$(adb shell pm list packages -3 2>/dev/null | sort)
  if ! timeout 300 adb install -r -g "$apk" 2>&1 | tail -1 | grep -qi success; then
    echo "   !! install gagal, lewati"
    return 0
  fi
  after=$(adb shell pm list packages -3 2>/dev/null | sort)
  pkg=$(comm -13 <(echo "$before") <(echo "$after") | head -1 | sed 's/^package://' | tr -d '\r')
  if [ -z "$pkg" ]; then
    echo "   !! paket tidak terdeteksi, lewati"
    return 0
  fi
  echo "   pkg=$pkg"

  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 9
  adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1   # tutup dialog sisa (kalau ada)
  sleep 1
  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 5
  shot "${name}-1"

  # buka tab/halaman lain lewat label yang umum dipakai app (best effort)
  local label
  for label in "Unduhan" "Downloads" "Atur" "Pengaturan" "Settings" "Tentang" "About" "Menu" "Profil" "Riwayat" "History"; do
    if tap_text "$label"; then
      sleep 3
      shot "${name}-$(echo "$label" | tr '[:upper:]' '[:lower:]')"
      adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1
      sleep 1
      break
    fi
  done

  # geser konten (kalau halamannya bisa di-scroll)
  adb shell input swipe 540 1900 540 700 300 >/dev/null 2>&1
  sleep 3
  shot "${name}-scroll"

  adb shell am force-stop "$pkg" >/dev/null 2>&1
  sleep 1
}

capture_app appperms apks/appperms.apk
capture_app dlaja     apks/dlaja.apk
capture_app kilat     apks/kilat.apk
capture_app nyawit    apks/nyawit.apk

rm -f "$RAW/.hashes"
echo "== hasil =="
ls -la "$RAW"
find "$RAW" -name '*.png' -size -20k -delete
