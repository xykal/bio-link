#!/usr/bin/env bash
# Dijalankan DI DALAM emulator runner (adb sudah tersedia).
# Untuk tiap APK: install -> launch -> ambil beberapa screenshot.
set -uo pipefail

RAW="raw-shots"
mkdir -p "$RAW"

echo "== perangkat =="
adb devices
adb shell getprop ro.build.version.release

# --- rapikan status bar: jam 12:00, sinyal penuh, baterai 100%, tanpa notifikasi
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

shot() {
  adb exec-out screencap -p > "$RAW/$1.png" 2>/dev/null
  local size
  size=$(stat -c%s "$RAW/$1.png" 2>/dev/null || echo 0)
  echo "   shot $1 (${size} bytes)"
  [ "$size" -gt 20000 ] || echo "   !! screenshot kecil, cek emulator"
}

# Tangkap layar: 2x swipe (maju), lalu 1x kembali ke atas
capture_app() {
  local name="$1" apk="$2"
  echo "== $name =="

  local before after pkg
  before=$(adb shell pm list packages -3 2>/dev/null | sort)
  if ! timeout 300 adb install -r -g "$apk" 2>&1 | tail -2; then
    echo "   !! install gagal, lanjut ke app berikutnya"
    return 0
  fi
  after=$(adb shell pm list packages -3 2>/dev/null | sort)
  pkg=$(comm -13 <(echo "$before") <(echo "$after") | head -1 | sed 's/^package://' | tr -d '\r')
  if [ -z "$pkg" ]; then
    echo "   !! paket tidak terdeteksi (mungkin sudah terpasang), pakai nama file"
    return 0
  fi
  echo "   pkg=$pkg"

  adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 8
  shot "${name}-1"

  # geser ke bawah untuk konten berikutnya
  adb shell input swipe 540 1800 540 800 320 >/dev/null 2>&1
  sleep 3
  shot "${name}-2"
  adb shell input swipe 540 1800 540 800 320 >/dev/null 2>&1
  sleep 3
  shot "${name}-3"

  # buka menu/tab pertama (kalau ada) lalu tangkap lagi
  adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1
  sleep 2
  shot "${name}-4"

  adb shell am force-stop "$pkg" >/dev/null 2>&1
  sleep 1
}

capture_app appperms apks/appperms.apk
capture_app dlaja     apks/dlaja.apk
capture_app kilat     apks/kilat.apk
capture_app nyawit    apks/nyawit.apk

echo "== hasil =="
ls -la "$RAW"
# buang screenshot yang gagal/kosong
find "$RAW" -name '*.png' -size -20k -delete
