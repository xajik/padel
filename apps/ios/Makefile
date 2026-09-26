# Padel iOS: build, test and run. `make help` lists targets; also callable as `make -C apps/ios <target>`.
# LOCAL=1 points the app at `make dev` on this Mac (http://localhost:3100) instead of production.

SHELL := /bin/bash

SIM      ?= iPhone 17 Pro
TEAM     ?= 83S2462FEL
BUNDLE   := app.padel.ios
DD       := build/dd
PROJECT  := Padel.xcodeproj
# arm64 only: the Kotlin framework (PadelShared) has no x86_64 simulator slice.
XCB      := xcodebuild -project $(PROJECT) -scheme Padel -derivedDataPath $(DD) -skipPackagePluginValidation
SIM_DEST := -destination "platform=iOS Simulator,name=$(SIM)"
APP      := $(DD)/Build/Products/Debug-iphonesimulator/Padel.app
ARCHIVE  := build/Padel.xcarchive

ifeq ($(LOCAL),1)
LAUNCH_ARGS := -baseURL http://localhost:3100
TEST_ENV    := TEST_RUNNER_PADEL_BASE_URL=http://localhost:3100
endif

.DEFAULT_GOAL := help

.PHONY: help
help: ## List all targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables: LOCAL=1 (local API)  SIM=\"$(SIM)\"  TEAM=$(TEAM)"

## Project

.PHONY: project
project: ## Regenerate Padel.xcodeproj from project.yml (XcodeGen)
	xcodegen generate --quiet

.PHONY: open
open: project ## Regenerate and open in Xcode
	open $(PROJECT)

## Build

.PHONY: build
build: project ## Debug build for the simulator
	$(XCB) $(SIM_DEST) ARCHS=arm64 -quiet build
	@echo "→ $(APP)"

.PHONY: archive
archive: project ## Signed Release archive for App Store / TestFlight (TEAM=…)
	$(XCB) -configuration Release -destination "generic/platform=iOS" -archivePath $(ARCHIVE) \
		-allowProvisioningUpdates DEVELOPMENT_TEAM=$(TEAM) -quiet archive
	@echo "→ $(ARCHIVE) (upload via Xcode Organizer)"

## Test

.PHONY: test
test: project ## Unit + widget render tests (PadelTests)
	$(TEST_ENV) $(XCB) $(SIM_DEST) -only-testing:PadelTests -quiet test

.PHONY: ui-test
ui-test: project ## UI tests (PadelUITests; TEST=PadelUITests/PadelUITests for one class)
	$(TEST_ENV) $(XCB) $(SIM_DEST) -only-testing:$(or $(TEST),PadelUITests) \
		-skip-testing:PadelUITests/StoreScreenshots -skip-testing:PadelUITests/CrossDeviceUITests -quiet test

.PHONY: test-all
test-all: test ui-test ## Unit and UI tests

## Run

.PHONY: run
run: build sim ## Build, install and launch on SIM
	xcrun simctl install "$(SIM)" $(APP)
	xcrun simctl launch --terminate-running-process "$(SIM)" $(BUNDLE) $(LAUNCH_ARGS)

.PHONY: sim
sim: ## Boot SIM and bring up Simulator.app
	@xcrun simctl bootstatus "$(SIM)" -b >/dev/null
	@open -a Simulator

.PHONY: logs
logs: ## Stream the app's logs from the booted simulator
	xcrun simctl spawn "$(SIM)" log stream --level debug --predicate 'process == "Padel"'

.PHONY: uninstall
uninstall: ## Remove the app from SIM
	xcrun simctl uninstall "$(SIM)" $(BUNDLE)

## Other

.PHONY: clean
clean: ## Remove build output (keeps the resolved Swift packages)
	rm -rf $(DD)/Build $(ARCHIVE)
