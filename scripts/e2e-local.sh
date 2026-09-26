#!/usr/bin/env bash
# End-to-end on this machine: the local stack (make dev: web :3100 + MCP :8788, local storage),
# the iOS simulator and the Android emulator. Nothing touches production.
#   1. KMP repository against the local API
#   2. iOS: unit, widget render and UI tests
#   3. Android: flow and widget render tests (running emulator required)
#   4. Cross-device: web creates a game → iPhone scores court 1 → Android sees it and scores
#      court 2 → iPhone sees Android's score → server and web page agree.
#   5. Join from a photo that shows only a game code (system photo picker → text recognition).
set -euo pipefail
cd "$(dirname "$0")/.."
LOCAL=http://localhost:3100
ANDROID_LOCAL=http://10.0.2.2:3100
IOS_SIM=${IOS_SIM:-iPhone 17 Pro}
ADB=${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb

curl -sf -o /dev/null "$LOCAL/" || { echo "Start the local stack first: make dev"; exit 1; }
"$ADB" get-state >/dev/null 2>&1 || { echo "Start an Android emulator first"; exit 1; }
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

ios_test() { # extra xcodebuild args…
  (cd apps/ios && TEST_RUNNER_PADEL_BASE_URL=$LOCAL "$@" xcodebuild test -project Padel.xcodeproj -scheme Padel \
    -destination "platform=iOS Simulator,name=$IOS_SIM" -derivedDataPath build/dd -quiet "${XC_ARGS[@]}")
}

step "1/5 Shared KMP repository ↔ local API"
(cd apps/mobile-shared && PADEL_LIVE_URL=$LOCAL ./gradlew jvmTest --tests 'app.americanoo.data.*' --console=plain -q --rerun-tasks)

step "2/5 iOS unit, widget render and UI tests"
(cd apps/ios && xcodegen generate --quiet)
XC_ARGS=(-skip-testing:PadelUITests/StoreScreenshots -skip-testing:PadelUITests/CrossDeviceUITests -skip-testing:PadelUITests/JoinFromPhotoUITests); ios_test env

step "3/5 Android flow and widget render tests"
(cd apps/android && ./gradlew :app:connectedDebugAndroidTest --console=plain -q -Ppadel.baseUrl=$ANDROID_LOCAL \
  -Pandroid.testInstrumentationRunnerArguments.class=app.americanoo.android.PadelFlowTest,app.americanoo.android.WidgetRenderTest,app.americanoo.android.ScanReaderTest)

step "4/5 Cross-device: web → iPhone → Android → iPhone"
game=$(curl -sf -X POST "$LOCAL/api/v1/games" -H 'Content-Type: application/json' \
  -d '{"mode":"americano","names":["Anna","Mikko","Laura","Jussi","Sara","Pekka","Emma","Olli"],"courts":2,"name":"Cross-device"}')
code=$(echo "$game" | python3 -c 'import json,sys;print(json.load(sys.stdin)["code"])')
key=$(echo "$game" | python3 -c 'import json,sys;print(json.load(sys.stdin)["organizerKey"])')
echo "   game $code"
XC_ARGS=(-only-testing:PadelUITests/CrossDeviceUITests); ios_test env TEST_RUNNER_E2E_CODE=$code TEST_RUNNER_E2E_KEY=$key TEST_RUNNER_E2E_STEP=score-court-1
(cd apps/android && ./gradlew :app:connectedDebugAndroidTest --console=plain -q -Ppadel.baseUrl=$ANDROID_LOCAL \
  -Pandroid.testInstrumentationRunnerArguments.class=app.americanoo.android.CrossDeviceTest \
  -Pandroid.testInstrumentationRunnerArguments.e2eCode=$code -Pandroid.testInstrumentationRunnerArguments.e2eKey=$key)
XC_ARGS=(-only-testing:PadelUITests/CrossDeviceUITests); ios_test env TEST_RUNNER_E2E_CODE=$code TEST_RUNNER_E2E_KEY=$key TEST_RUNNER_E2E_STEP=see-android

curl -sf "$LOCAL/api/games/$code" | python3 -c '
import json,sys
g=json.load(sys.stdin)["game"]; m=g["state"]["rounds"][0]["matches"]
got=[(x["scoreA"],x["scoreB"]) for x in m]
assert got==[(16,8),(9,15)], got
print("   server:", got)'
curl -sf -o /dev/null -w "   web page /g/$code: %{http_code}\n" "$LOCAL/g/$code"
step "5/5 Join from a photo showing a game code (Android and iOS photo pickers)"
(cd apps/android && ./gradlew :app:connectedDebugAndroidTest --console=plain -q -Ppadel.baseUrl=$ANDROID_LOCAL \
  -Pandroid.testInstrumentationRunnerArguments.class=app.americanoo.android.JoinFromPhotoTest)
photo_game=$(curl -sf -X POST "$LOCAL/api/v1/games" -H 'Content-Type: application/json' \
  -d '{"mode":"americano","names":["Anna","Mikko","Laura","Jussi","Sara","Pekka","Emma","Olli"],"courts":2,"name":"Photo join iOS"}')
photo_code=$(echo "$photo_game" | python3 -c 'import json,sys;print(json.load(sys.stdin)["code"])')
photo=$(mktemp -t padel-code).png
# A "screenshot" with only the code on it, rendered by headless Chrome (no Python imaging deps).
page=$(mktemp -t padel-code).html
printf '<body style="margin:0;background:#fff;font-family:Menlo,monospace;padding:80px"><p style="font-size:56px">Share game</p><p style="font-size:56px;margin-top:300px">Game code</p><p style="font-size:170px;font-weight:700">%s</p></body>' "$photo_code" > "$page"
"${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}" --headless=new --disable-gpu --hide-scrollbars --window-size=1170,1600 --screenshot="$photo" "file://$page" >/dev/null 2>&1
sim=$(xcrun simctl list devices booted -j | python3 -c "import json,sys;print(next(d['udid'] for v in json.load(sys.stdin)['devices'].values() for d in v if d['name']=='$IOS_SIM'))")
xcrun simctl addmedia "$sim" "$photo"
XC_ARGS=(-only-testing:PadelUITests/JoinFromPhotoUITests); ios_test env TEST_RUNNER_E2E_PHOTO_NAME="Photo join iOS"

printf '\n\033[1m✓ Local end-to-end passed\033[0m\n'
