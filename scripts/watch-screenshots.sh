#!/usr/bin/env bash
# App Store Apple Watch screenshots from the real watch app (PadelWatchUITests/WatchStoreScreenshots)
# with the demo games. App Store Connect takes one of the watch sizes; both current ones are made.
# The clock shows the real time: watchOS simulators have no status bar override.
# Output: store/ios/<size>/NN-name.png
#   watch-series-12  Apple Watch Series 12 (46mm)  416×496
#   watch-ultra-4    Apple Watch Ultra 4 (49mm)    422×514
set -euo pipefail
cd "$(dirname "$0")/../apps/ios"
OUT="$(cd ../.. && pwd)/store/ios"
RUNTIME="${RUNTIME:-com.apple.CoreSimulator.SimRuntime.watchOS-27-0}"
xcodegen generate --quiet

device() { # name, devicetype id → udid (created once as "Padel <name>")
  local udid
  udid=$(xcrun simctl list devices available -j | python3 -c "import json,sys;print(next((d['udid'] for d in json.load(sys.stdin)['devices'].get('$RUNTIME', []) if d['name']=='Padel $1'),''))")
  if [ -z "$udid" ]; then udid=$(xcrun simctl create "Padel $1" "$2" "$RUNTIME"); fi
  echo "$udid"
}

shoot() { # size, device name, devicetype
  if [ -n "${SIZE:-}" ] && [ "$SIZE" != "$1" ]; then return; fi
  local size=$1 udid
  udid=$(device "$2" "$3")
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  rm -rf "build/shots-$size.xcresult"
  TEST_RUNNER_STORE_SCREENSHOTS=1 xcodebuild test -project Padel.xcodeproj -scheme PadelWatch -destination "id=$udid" ARCHS=arm64 \
    -parallel-testing-enabled NO -derivedDataPath build/dd -only-testing:PadelWatchUITests/WatchStoreScreenshots -only-testing:PadelWatchUITests/WatchFlowUITests -resultBundlePath "build/shots-$size.xcresult" -quiet
  rm -rf "build/shots-$size" && mkdir -p "build/shots-$size" "$OUT/$size"
  xcrun xcresulttool export attachments --path "build/shots-$size.xcresult" --output-path "build/shots-$size" >/dev/null
  python3 - "build/shots-$size" "$OUT/$size" <<'PY'
import json, shutil, sys, os
src, dst = sys.argv[1], sys.argv[2]
expected = {'01-round', '05-group', '04-start-again', '02-score', '03-next-round'}
shots = {}
for test in json.load(open(os.path.join(src, "manifest.json"))):
    for attachment in test["attachments"]:
        name = attachment["suggestedHumanReadableName"].split("_")[0]
        if name in expected:
            path = os.path.join(src, attachment["exportedFileName"])
            with open(path, "rb") as image:
                assert image.read(8) == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}"
            shots[name] = path
assert set(shots) == expected, f"Missing screenshots: {expected - set(shots)}"
for name, path in sorted(shots.items()):
    shutil.copy(path, os.path.join(dst, name + ".png"))
    print("  ", os.path.join(dst, name + ".png"))
PY
}

shoot watch-series-12 "Watch Series 12" com.apple.CoreSimulator.SimDeviceType.Apple-Watch-Series-12-46mm
shoot watch-ultra-4 "Watch Ultra 4" com.apple.CoreSimulator.SimDeviceType.Apple-Watch-Ultra-4-49mm
