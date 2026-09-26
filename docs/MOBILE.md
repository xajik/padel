# Native apps (M6)

iOS (`apps/ios`, SwiftUI) and Android (`apps/android`, Jetpack Compose) share one Kotlin
Multiplatform module (`apps/mobile-shared`): the engine port and the data layer. UI is native on
each platform, built from the generated design system (`make native-assets`).

## Identity

| | iOS | Android |
|---|---|---|
| Store name | Americanoo: Padel Score | Americanoo: Padel Score |
| Home-screen name | Americanoo (also the in-app home header) | Americanoo (also the in-app home header and empty widget) |
| ID | `app.americanoo.ios` (widget `.widgets`, tests `.tests` / `.uitests`) | `app.americanoo.android` |
| SKU | `americanoo-ios` | — |
| Other | App Group `group.app.americanoo`, URL scheme `americanoo://` | URL scheme `americanoo://` |

Kotlin sources live under `app.americanoo.*` (`android`, `data`, `engine`); the Gradle coordinates
of the shared module are `app.americanoo:shared`.

## Build, run and test

Each app has its own Makefile (`make help` inside the folder); from the repo root the same targets
run as `make android-<target>` / `make ios-<target>`. `LOCAL=1` points either app at `make dev` on
this Mac instead of production.

| | Android (`apps/android`) | iOS (`apps/ios`) |
|---|---|---|
| Build | `build` (debug APK) · `release` (signed APK) · `bundle` (signed AAB for Play) | `build` (simulator) · `archive` (signed Release for App Store / TestFlight, `TEAM=…`) |
| Test | `test` (shared Kotlin JVM + unit) · `ui-test` (`CLASS=…`) · `lint` | `test` (unit + widget render) · `ui-test` (`TEST=…`) · `test-all` |
| Run | `emulator` (`AVD=Padel_Phone`) · `run` · `run-release` · `logs` · `uninstall` | `sim` (`SIM="iPhone 17 Pro"`) · `run` · `logs` · `uninstall` |
| Other | `sha` (debug + release signing fingerprints) · `clean` | `project` (XcodeGen) · `open` · `clean` |

iOS simulator builds are arm64 only: the Kotlin framework has no x86_64 simulator slice.

## Firebase and signing

Firebase project `padel-americanoo`. The per-app config files are gitignored (public repo) and live next to each app:

| | File | Init |
|---|---|---|
| Android `app.americanoo.android` | `apps/android/app/google-services.json` | Google services Gradle plugin + Firebase BoM (Analytics); auto-initialised |
| iOS `app.americanoo.ios` (team `83S2462FEL`) | `apps/ios/Padel/GoogleService-Info.plist` | Firebase SPM package (Core, Analytics); `FirebaseApp.configure()` in `PadelApp.swift`'s `AppDelegate` |

Without the files (CI, forks) both apps build and run with Firebase off. Android release builds are
signed with the upload key `apps/android/release.jks` (alias `padel`), configured by
`apps/android/keystore.properties`; both are gitignored and must be backed up. Without them release
builds are unsigned and `make release` / `make bundle` refuse to run. Fingerprints for Firebase and
App Links: `make android-sha`.

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
  `americanoo://g/CODE[?key=…]`. QR codes encode the https spectator link, so they open the app where
  installed and the web everywhere else. Joining: type the code, paste a link, **scan** with the
  camera, or pick a **photo/screenshot**. Scanning and photos read both QR codes and a game code
  written or shown anywhere (iOS: VisionKit live scanner, Core Image QR + Vision text; Android:
  CameraX + ML Kit barcode/text, zxing + ML Kit for photos). `GameLinks.candidates` ranks what was
  read and `joinScanned` tries candidates until the server knows one, so a word that merely looks
  like a code ("SCREEN") doesn't block the real one.
- **Verified links**: the web serves `/.well-known/assetlinks.json` (Android, from
  `ANDROID_CERT_SHA256`) and `/.well-known/apple-app-site-association` (iOS, once `APPLE_TEAM_ID` is
  set in `apps/web/wrangler.jsonc`). `ANDROID_CERT_SHA256` holds the debug and upload-key
  fingerprints; add the Play App Signing fingerprint before release.

## Live game surfaces

| | iOS | Android |
|---|---|---|
| Lock Screen / status | Live Activity (Lock Screen + Dynamic Island), menu → *Follow on Lock Screen* | ongoing notification, menu → *Follow in notifications*; promoted *Live Update* with round progress on Android 16+ |
| Home screen | WidgetKit widget (small, medium, Lock Screen rectangular/inline) | Glance widget (small, wide, large) |
| Data | App Group snapshot written by the app | the app's repository |

Both update whenever the game changes on the phone or through polling. **Limit:** with the app
closed there are no remote updates yet; that needs APNs push tokens for Live Activities and FCM for
Android (Firebase is wired in; messaging is not added yet).

## Testing

| Command | What |
|---|---|
| `make mobile-test` | Kotlin engine vs `packages/engine/fixtures` (JVM + iOS sim), repository and link tests, Android unit tests |
| `PADEL_LIVE_URL=https://padel-web.xajik0.workers.dev ./gradlew jvmTest` (in `apps/mobile-shared`) | repository against the deployed API |
| `make ios-test` / `make ios-ui-test` | iOS unit + widget render tests / UI tests against the deployed API (create → score → web sees it; join by link; web edits reach the phone; Live Activity) |
| `make android-ui-test` | same flows on a running Android emulator |
| `make dev` then `make e2e-local` | everything above against the **local stack** (web :3100 + MCP :8788, local storage; nothing touches production), plus a cross-device run on one game (web creates → iPhone scores court 1 → Android sees it and scores court 2 → iPhone sees Android's score → server and web agree) and joining from a photo that shows only a game code through each platform's photo picker |

Local runs point the apps elsewhere: iOS `-baseURL http://localhost:3100` (launch argument; plain http is
allowed only for local-network hosts), Android `-Ppadel.baseUrl=http://10.0.2.2:3100` (debug builds allow
cleartext to the host machine only).

## Store assets

| Command | Output |
|---|---|
| `make ios-screenshots` | `store/ios/{iphone-6.9, iphone-6.5, ipad-13}/NN-*.png` (1320×2868, 1284×2778, 2064×2752) |
| `make android-screenshots` | `store/android/{phone, tablet-7, tablet-10}/NN-*.png` (1080×1920, 1200×1920, 1600×2560) |
| `npm run app-icons -w @padel/design` | iOS App Icon 1024, `store/android/play-icon-512.png`, `store/android/feature-graphic.png` |

Screenshots come from the real apps with demo games (`-demo` / `demo` extra), a clean 9:41 status bar
and light appearance. Each size has the same 7 shots in upload order: `01-game`, `02-score-pad`,
`03-leaderboard`, `04-share-qr`, `05-home`, `06-podium`, `07-new-game`. They show the Americanoo
brand (home header, feature graphic); regenerate all of them after UI or brand changes.

## Before release

- Apple: set `DEVELOPMENT_TEAM` (`apps/ios/project.yml`) and `APPLE_TEAM_ID` to `83S2462FEL`; register
  the App Group `group.app.americanoo` and the Associated Domains capability; upload an APNs key to Firebase.
- Android: after the first Play upload, add the Play App Signing SHA-1/SHA-256 to Firebase (then
  re-download `google-services.json`) and the SHA-256 to `ANDROID_CERT_SHA256`.
- Android toolchain: AGP 8.13 / compileSdk 36; the newest androidx (navigation 2.10, lifecycle 2.11)
  and OkHttp 5.5 need AGP 9.1 + SDK 37 (the app uses Ktor's Android engine meanwhile).
