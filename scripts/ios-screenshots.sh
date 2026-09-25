#!/usr/bin/env bash
# App Store screenshots from the real app (PadelUITests/StoreScreenshots) on the sizes App Store
# Connect asks for. Output: store/ios/<size>/NN-name.png
#   iphone-6.9  iPhone 17 Pro Max   1320×2868 (required)
#   iphone-6.5  iPhone 14 Plus      1284×2778
#   ipad-13     iPad Pro 13" (M5)   2064×2752 (required for iPad)
set -euo pipefail
cd "$(dirname "$0")/../apps/ios"
OUT="$(cd ../.. && pwd)/store/ios"
xcodegen generate --quiet

device() { # name, devicetype id → udid (created once as "Padel <name>")
  local udid
  udid=$(xcrun simctl list devices available -j | python3 -c "import json,sys;print(next((d['udid'] for v in json.load(sys.stdin)['devices'].values() for d in v if d['name']=='Padel $1'),''))")
  if [ -z "$udid" ]; then udid=$(xcrun simctl create "Padel $1" "$2"); fi
  echo "$udid"
}

shoot() { # size, device name, devicetype
  local size=$1 udid
  udid=$(device "$2" "$3")
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl ui "$udid" appearance "${APPEARANCE:-light}"
  xcrun simctl status_bar "$udid" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
  rm -rf "build/shots-$size.xcresult"
  TEST_RUNNER_STORE_SCREENSHOTS=1 xcodebuild test -project Padel.xcodeproj -scheme Padel -destination "id=$udid" \
    -derivedDataPath build/dd -only-testing:PadelUITests/StoreScreenshots -resultBundlePath "build/shots-$size.xcresult" -quiet
  rm -rf "build/shots-$size" && mkdir -p "build/shots-$size" "$OUT/$size"
  xcrun xcresulttool export attachments --path "build/shots-$size.xcresult" --output-path "build/shots-$size" >/dev/null
  python3 - "build/shots-$size" "$OUT/$size" <<'PY'
import json, shutil, sys, os
src, dst = sys.argv[1], sys.argv[2]
for test in json.load(open(os.path.join(src, "manifest.json"))):
    for a in test["attachments"]:
        name = a["suggestedHumanReadableName"].split("_")[0]
        shutil.copy(os.path.join(src, a["exportedFileName"]), os.path.join(dst, name + ".png"))
        print("  ", os.path.join(dst, name + ".png"))
PY
  xcrun simctl status_bar "$udid" clear
}

shoot iphone-6.9 "iPhone 17 Pro Max" com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max
shoot iphone-6.5 "iPhone 14 Plus" com.apple.CoreSimulator.SimDeviceType.iPhone-14-Plus
shoot ipad-13 "iPad Pro 13" com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB
