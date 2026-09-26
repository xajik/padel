# Padel Android: build, test and run. `make help` lists targets; also callable as `make -C apps/android <target>`.
# LOCAL=1 points the app at `make dev` on the host (http://10.0.2.2:3100) instead of production.

SHELL := /bin/bash

SDK      ?= $(or $(ANDROID_HOME),$(HOME)/Library/Android/sdk)
ADB      := $(SDK)/platform-tools/adb
EMULATOR := $(SDK)/emulator/emulator
AVD      ?= Padel_Phone
APP_ID   := app.americanoo.android
GRADLE   := ./gradlew --console=plain

ifeq ($(LOCAL),1)
GRADLE += -Ppadel.baseUrl=http://10.0.2.2:3100
endif

APK_DEBUG   := app/build/outputs/apk/debug/app-debug.apk
APK_RELEASE := app/build/outputs/apk/release/app-release.apk
AAB_RELEASE := app/build/outputs/bundle/release/app-release.aab

.DEFAULT_GOAL := help

.PHONY: help
help: ## List all targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables: LOCAL=1 (local API)  AVD=$(AVD)  (avds: $$($(EMULATOR) -list-avds 2>/dev/null | tr '\n' ' '))"

## Build

.PHONY: build
build: ## Debug APK
	$(GRADLE) :app:assembleDebug
	@echo "→ $(APK_DEBUG)"

.PHONY: release
release: signing-check ## Signed, minified release APK
	$(GRADLE) :app:assembleRelease
	@echo "→ $(APK_RELEASE)"

.PHONY: bundle
bundle: signing-check ## Signed release App Bundle for Google Play
	$(GRADLE) :app:bundleRelease
	@echo "→ $(AAB_RELEASE)"

.PHONY: signing-check
signing-check:
	@test -f keystore.properties || (echo "Missing apps/android/keystore.properties (+ release.jks): release builds would be unsigned" && exit 1)

## Test

.PHONY: test
test: ## Shared Kotlin tests (JVM) + Android unit tests
	cd ../mobile-shared && ./gradlew jvmTest --console=plain
	$(GRADLE) :app:testDebugUnitTest

.PHONY: ui-test
ui-test: device ## Instrumented tests on the running emulator/device (CLASS=app.americanoo.android.PadelFlowTest for one)
	$(GRADLE) :app:connectedDebugAndroidTest $(if $(CLASS),-Pandroid.testInstrumentationRunnerArguments.class=$(CLASS))

.PHONY: lint
lint: ## Android lint (debug)
	$(GRADLE) :app:lintDebug

## Run

.PHONY: run
run: device ## Build, install and launch the debug app
	$(GRADLE) :app:installDebug
	$(ADB) shell am start -n $(APP_ID)/.MainActivity

.PHONY: run-release
run-release: device release ## Install and launch the signed release APK
	$(ADB) install -r $(APK_RELEASE)
	$(ADB) shell am start -n $(APP_ID)/.MainActivity

.PHONY: emulator
emulator: ## Start the AVD emulator in the background and wait for boot
	@$(ADB) get-state >/dev/null 2>&1 && echo "A device is already connected" || { \
		nohup $(EMULATOR) -avd $(AVD) -no-snapshot-save >/dev/null 2>&1 & \
		echo "Booting $(AVD)…"; $(ADB) wait-for-device; \
		until [ "$$($(ADB) shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 2; done; \
		echo "Booted"; }

.PHONY: device
device:
	@$(ADB) get-state >/dev/null 2>&1 || (echo "No device/emulator: run 'make emulator' (AVD=$(AVD))" && exit 1)

.PHONY: logs
logs: device ## Logcat for the running app
	$(ADB) logcat --pid=$$($(ADB) shell pidof -s $(APP_ID))

.PHONY: uninstall
uninstall: device ## Remove the app from the device
	$(ADB) uninstall $(APP_ID)

## Other

.PHONY: sha
sha: ## SHA-1 / SHA-256 of the debug and release signing keys (Firebase, App Links)
	@$(GRADLE) -q --no-configuration-cache :app:signingReport | grep -E "^Variant: (debug|release)$$|SHA1|SHA-256" | grep -A2 -E "^Variant"

.PHONY: clean
clean: ## Remove build output
	$(GRADLE) clean
