# Native apps (M6)

iOS (`apps/ios`, SwiftUI) and Android (`apps/android`, Jetpack Compose) share one Kotlin
Multiplatform module (`apps/mobile-shared`): the engine port and the data layer. UI is native on
each platform, built from the generated design system (`make native-assets`).

## How the apps and the web work together

All clients use the same cloud game API served by the web Worker (proxied to `apps/mcp`):

| | Endpoint | Used for |
|---|---|---|
| Create | `POST /api/v1/games` → code + organizer key | new game (then `replace` with the phone's own schedule) |
| Read | `GET /api/games/{code}` | open / poll a game (every 4 s while on screen, like the web) |
| Edit | `POST /api/games/{code}/mutate` (`X-Organizer-Key`) | `score` / `next` / `finish` / `reopen` / `replace` |
| Rights | `POST /api/games/{code}/redeem` | organizer links grant editing |

- **Offline first** (`GameRepository`): every edit is applied locally with the shared engine, then
  queued as the same granular mutation the web sends. The queue is flushed in order; the server's
  answer becomes the local state, so phones, the web and AI agents converge. A game created offline
  gets a provisional code and is registered when the phone is back online.
- **Web games → phones**: a game created on the website lives in that browser until the organizer
  taps **Share live** in the share dialog, which publishes it (new code, organizer key kept in
  the browser). Until the Firestore repository lands, that's the only way to follow a web game elsewhere.
- **Codes, links, QR**: `GameLinks` parses a code, `https://…/g/CODE[?key=…]`, `…/join?code=…` and
  `padel://g/CODE[?key=…]`. QR codes encode the https spectator link, so they open the app where
  installed and the web everywhere else. Joining: type the code, paste a link, scan (VisionKit /
  Google code scanner) or pick a photo/screenshot of a QR.
- **Verified links**: the web serves `/.well-known/assetlinks.json` (Android, from
  `ANDROID_CERT_SHA256`) and `/.well-known/apple-app-site-association` (iOS, once `APPLE_TEAM_ID` is
  set in `apps/web/wrangler.jsonc`). Add the Play App Signing fingerprint before release.

## Live game surfaces

| | iOS | Android |
|---|---|---|
| Lock Screen / status | Live Activity (Lock Screen + Dynamic Island), menu → *Follow on Lock Screen* | ongoing notification, menu → *Follow in notifications*; promoted *Live Update* with round progress on Android 16+ |
| Home screen | WidgetKit widget (small, medium, Lock Screen rectangular/inline) | Glance widget (small, wide, large) |
| Data | App Group snapshot written by the app | the app's repository |

Both update whenever the game changes on the phone or through polling. **Limit:** with the app
closed there are no remote updates yet; that needs APNs push tokens for Live Activities and FCM for
Android (planned with Firebase).

## Testing

| Command | What |
|---|---|
| `make mobile-test` | Kotlin engine vs `packages/engine/fixtures` (JVM + iOS sim), repository and link tests, Android unit tests |
| `PADEL_LIVE_URL=https://padel-web.xajik0.workers.dev ./gradlew jvmTest` (in `apps/mobile-shared`) | repository against the deployed API |
| `make ios-test` / `make ios-ui-test` | iOS unit + widget render tests / UI tests against the deployed API (create → score → web sees it; join by link; web edits reach the phone; Live Activity) |
| `make android-ui-test` | same flows on a running Android emulator |

## Store assets

| Command | Output |
|---|---|
| `make ios-screenshots` | `store/ios/{iphone-6.9, iphone-6.5, ipad-13}/NN-*.png` (1320×2868, 1284×2778, 2064×2752) |
| `make android-screenshots` | `store/android/{phone, tablet-7, tablet-10}/NN-*.png` (1080×1920, 1200×1920, 1600×2560) |
| `npm run app-icons -w @padel/design` | iOS App Icon 1024, `store/android/play-icon-512.png`, `store/android/feature-graphic.png` |

Screenshots come from the real apps with demo games (`-demo` / `demo` extra), a clean 9:41 status bar
and light appearance.

## Before release

- Apple: set `DEVELOPMENT_TEAM` (`apps/ios/project.yml`) and `APPLE_TEAM_ID`; register the App Group
  `group.app.padel` and the Associated Domains capability.
- Android: release signing, Play App Signing fingerprint in `ANDROID_CERT_SHA256`.
- Android toolchain: AGP 8.13 / compileSdk 36; the newest androidx (navigation 2.10, lifecycle 2.11)
  and OkHttp 5.5 need AGP 9.1 + SDK 37 (the app uses Ktor's Android engine meanwhile).
