#!/usr/bin/env bash
# App Store Apple Watch screenshots from the real watch app (PadelWatchUITests/WatchStoreScreenshots)
# with the demo games. App Store Connect takes one of the watch sizes; both current ones are made.
# The clock shows the real time: watchOS simulators have no status bar override.
# Output: store/ios/<size>/NN-name.png
#   watch-series-11  Apple Watch Series 11 (46mm)  416×496
#   watch-ultra-3    Apple Watch Ultra 3 (49mm)    422×514
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
  rm -rf "build/shots-$size.xcresult"
  TEST_RUNNER_STORE_SCREENSHOTS=1 xcodebuild test -project Padel.xcodeproj -scheme PadelWatch -destination "id=$udid" ARCHS=arm64 \
    -derivedDataPath build/dd -only-testing:PadelWatchUITests/WatchStoreScreenshots -resultBundlePath "build/shots-$size.xcresult" -quiet
  rm -rf "build/shots-$size" "$OUT/$size" && mkdir -p "build/shots-$size" "$OUT/$size"
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
}

shoot watch-series-11 "Watch Series 11" com.apple.CoreSimulator.SimDeviceType.Apple-Watch-Series-11-46mm
shoot watch-ultra-3 "Watch Ultra 3" com.apple.CoreSimulator.SimDeviceType.Apple-Watch-Ultra-3-49mm
