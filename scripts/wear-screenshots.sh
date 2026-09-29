#!/usr/bin/env bash
# Play Store Wear OS screenshots from the real app with demo games, on the Padel_Wear emulator
# (Wear OS 5, large round, 454×454; Play needs 1:1 and at least 384×384, app UI only).
# Output: store/android/wear/NN-name.png
set -euo pipefail
cd "$(dirname "$0")/.."
SDK=${ANDROID_HOME:-$HOME/Library/Android/sdk}
ADB=$SDK/platform-tools/adb
AVD=${WEAR_AVD:-Padel_Wear}
IMAGE="system-images;android-34;android-wear;arm64-v8a"
APP=app.americanoo.android
OUT=store/android/wear

serial() { "$ADB" devices -l | awk '/gwear|wear|watch/ {print $1; exit}'; }

if [ -z "$(serial)" ]; then
  if ! "$SDK/emulator/emulator" -list-avds | grep -qx "$AVD"; then
    yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" "$IMAGE" >/dev/null
    echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" create avd -n "$AVD" -k "$IMAGE" -d wearos_large_round >/dev/null
  fi
  "$SDK/emulator/emulator" -avd "$AVD" -no-audio -no-boot-anim -no-snapshot-save >/dev/null 2>&1 &
  until [ -n "$(serial)" ]; do sleep 2; done
fi
export ANDROID_SERIAL=$(serial)
until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done

# 9:41 on the watch face's time text (root on emulator images; automatic time off).
"$ADB" root >/dev/null && sleep 2
"$ADB" shell settings put global auto_time 0
clock() { "$ADB" shell "date $(date +%m%d)0941$(date +%Y).00" >/dev/null; sleep 1; }
shot() { clock; "$ADB" exec-out screencap -p > "$OUT/$1.png"; echo "   $OUT/$1.png"; }
crown() { for _ in $(seq "${2:-1}"); do "$ADB" shell input rotaryencoder scroll --axis "SCROLL,$1"; done; sleep 1; }
launch() { "$ADB" shell am start -n "$APP/app.americanoo.wear.MainActivity" "$@" >/dev/null; }

(cd apps/android && ./gradlew --console=plain -q :wear:installDebug)
"$ADB" shell pm clear "$APP" >/dev/null
# Demo games (a finished Sunday Mexicano, a live Tuesday Americano in round 3), synced with the server.
launch --ez demo true
sleep 20
"$ADB" shell am force-stop "$APP"
launch   # the single live game opens straight away
sleep 5

rm -rf "$OUT" && mkdir -p "$OUT"
shot 01-round
"$ADB" shell input tap 227 380 && sleep 2      # court 2
crown -1 2                                      # 12 → 14, the other pair gets 10
shot 02-score
"$ADB" shell input tap 227 385 && sleep 3      # Save
"$ADB" shell input swipe 227 380 227 80 300 && sleep 1.5
shot 03-next-round
"$ADB" shell input keyevent KEYCODE_BACK && sleep 2
"$ADB" shell input swipe 227 380 227 120 300 && sleep 1.5
shot 04-start-again
"$ADB" shell input tap 227 295 && sleep 2      # Sunday Mexicano
shot 05-group

"$ADB" shell settings put global auto_time 1
