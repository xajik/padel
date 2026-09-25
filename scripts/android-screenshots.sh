#!/usr/bin/env bash
# Play Store screenshots from the real app (androidTest StoreScreenshots) on store-sized emulators.
# Output: store/android/<size>/NN-name.png
#   phone      1080×1920  (9:16; Play allows at most 2:1)
#   tablet-7   1200×1920
#   tablet-10  1600×2560
set -euo pipefail
cd "$(dirname "$0")/.."
SDK=${ANDROID_HOME:-$HOME/Library/Android/sdk}
ADB=$SDK/platform-tools/adb
AVDMANAGER=$SDK/cmdline-tools/latest/bin/avdmanager
IMAGE="system-images;android-35;google_apis;arm64-v8a"
OUT=store/android

avd() { # name width height density
  local dir="$HOME/.android/avd/$1.avd"
  if [ ! -d "$dir" ]; then
    echo no | "$AVDMANAGER" create avd -n "$1" -k "$IMAGE" -d pixel_3a --force >/dev/null
  fi
  sed -i '' -e "s/^hw.lcd.width.*/hw.lcd.width = $2/" -e "s/^hw.lcd.height.*/hw.lcd.height = $3/" -e "s/^hw.lcd.density.*/hw.lcd.density = $4/" \
    -e "s/^skin.name.*/skin.name = ${2}x${3}/" -e "s/^showDeviceFrame.*/showDeviceFrame = no/" "$dir/config.ini"
}

shoot() { # size avd width height density
  local size=$1
  avd "$2" "$3" "$4" "$5"
  "$ADB" devices | grep -q emulator && "$ADB" emu kill >/dev/null 2>&1 || true
  sleep 3
  "$SDK/emulator/emulator" -avd "$2" -no-window -no-audio -no-boot-anim -no-snapshot >/dev/null 2>&1 &
  "$ADB" wait-for-device
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
  "$ADB" shell cmd uimode night no
  # Clean status bar: System UI demo mode (the broadcast must target SystemUI explicitly).
  sleep 10 # SystemUI keeps initialising after boot_completed and would drop the demo commands.
  "$ADB" shell settings put global sysui_demo_allowed 1
  "$ADB" shell input keyevent KEYCODE_WAKEUP
  "$ADB" shell wm dismiss-keyguard
  for cmd in "enter" "clock -e hhmm 0941" "battery -e level 100 -e plugged false" \
             "network -e wifi show -e level 4 -e fully true" "network -e mobile hide" "notifications -e visible false"; do
    "$ADB" shell "am broadcast -a com.android.systemui.demo -p com.android.systemui -e command $cmd" >/dev/null
  done
  "$ADB" shell rm -rf /data/local/tmp/padel-shots
  (cd apps/android && ./gradlew :app:connectedDebugAndroidTest --console=plain -q \
    -Pandroid.testInstrumentationRunnerArguments.class=app.padel.android.StoreScreenshots \
    -Pandroid.testInstrumentationRunnerArguments.storeScreenshots=true)
  rm -rf "$OUT/$size" && mkdir -p "$OUT/$size"
  "$ADB" pull /data/local/tmp/padel-shots/. "$OUT/$size" >/dev/null
  ls "$OUT/$size" | sed "s|^|   $OUT/$size/|"
  "$ADB" emu kill >/dev/null 2>&1 || true
}

shoot phone Padel_Phone 1080 1920 420
shoot tablet-7 Padel_Tablet_7 1200 1920 320
shoot tablet-10 Padel_Tablet_10 1600 2560 320
