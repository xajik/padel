# Padel Americano: run, test, build and deploy (Cloudflare Workers via wrangler).
# `make help` lists every target. Works with the GNU Make 3.81 that ships with macOS.

SHELL := /bin/bash

BIN        := $(CURDIR)/node_modules/.bin
WRANGLER   := $(BIN)/wrangler
OPENNEXT   := $(BIN)/opennextjs-cloudflare
NEXT       := $(BIN)/next
WEB        := apps/web
MCP        := apps/mcp

WEB_PORT   ?= 3100
MCP_PORT   ?= 8788
PROD_URL   ?= https://padel-web.xajik0.workers.dev
MCP_PROD   ?= https://padel-mcp.xajik0.workers.dev
R2_BUCKET  ?= padel-web-opennext-cache

GIT_SHA    := $(shell git rev-parse --short HEAD 2>/dev/null)

# Target URL for smoke / e2e checks: `make smoke URL=https://...` (defaults to local dev).
URL        ?= http://localhost:$(WEB_PORT)

# Native apps (M6). IOS_SIM: any available simulator name, e.g. "iPhone 17 Pro".
SHARED     := apps/mobile-shared
ANDROID    := apps/android
IOS        := apps/ios
IOS_SIM    ?= iPhone 17 Pro

.DEFAULT_GOAL := help

## ---------- Setup ----------

.PHONY: help
help: ## List all targets
	@awk 'BEGIN {FS = ":.*?## "} /^## -+/ {gsub(/## -+ ?| -+$$/, ""); printf "\n\033[1m%s\033[0m\n", $$0} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables: URL=<base url> TAG=vX.Y.Z WEB_PORT=$(WEB_PORT) MCP_PORT=$(MCP_PORT)"

.PHONY: install
install: ## Install all workspace dependencies
	npm install

.PHONY: ci-install
ci-install: ## Clean, reproducible install (CI)
	npm ci

.PHONY: login
login: ## Log wrangler in to Cloudflare (opens a browser)
	$(WRANGLER) login

.PHONY: whoami
whoami: ## Show the Cloudflare account wrangler uses
	$(WRANGLER) whoami

.PHONY: cf-setup
cf-setup: ## One-time Cloudflare resources (R2 bucket for the Next.js cache)
	-$(WRANGLER) r2 bucket create $(R2_BUCKET)

.PHONY: types
types: ## Regenerate Worker binding types and Next.js route types
	cd $(WEB) && $(WRANGLER) types --env-interface CloudflareEnv cloudflare-env.d.ts && $(NEXT) typegen
	cd $(MCP) && $(WRANGLER) types

.PHONY: icons
icons: ## Export the custom icon set to packages/design/svg (for the native apps)
	cd packages/design && node --experimental-strip-types scripts/export-icons.ts

## ---------- Run locally ----------

.PHONY: dev
dev: ## Run MCP worker + web app together (Ctrl+C stops both)
	@$(MAKE) -j2 dev-mcp dev-web

.PHONY: dev-web
dev-web: ## Next.js dev server on WEB_PORT (bindings from wrangler.jsonc)
	cd $(WEB) && $(NEXT) dev --port $(WEB_PORT)

.PHONY: dev-mcp
dev-mcp: ## MCP worker + Durable Objects on MCP_PORT (wrangler dev)
	cd $(MCP) && $(WRANGLER) dev --port $(MCP_PORT)

.PHONY: preview
preview: build-web ## Run the production web build in the Workers runtime (workerd)
	cd $(WEB) && $(OPENNEXT) preview

.PHONY: preview-mcp-remote
preview-mcp-remote: ## Run the MCP worker locally against remote Cloudflare resources
	cd $(MCP) && $(WRANGLER) dev --remote --port $(MCP_PORT)

## ---------- Quality ----------

.PHONY: test
test: test-engine test-mcp ## All unit tests

.PHONY: test-engine
test-engine: ## Pairing & scoring engine tests
	npm test -w @padel/engine

.PHONY: test-mcp
test-mcp: ## MCP game-logic tests
	npm test -w @padel/mcp

.PHONY: typecheck
typecheck: ## Typecheck engine, MCP and web
	npm run typecheck -w @padel/engine
	npm run typecheck -w @padel/mcp
	npm run typecheck -w @padel/web

.PHONY: lint
lint: ## ESLint for the web app
	npm run lint -w @padel/web

.PHONY: check
check: test typecheck ## Tests + typecheck (run before every deploy)

.PHONY: smoke
smoke: ## Smoke-test public routes and AI crawler access (URL=...)
	./scripts/smoke.sh $(URL)

.PHONY: e2e-mcp
e2e-mcp: ## End-to-end MCP tool flow against URL/mcp (URL=...)
	node scripts/mcp-e2e.mjs $(URL)/mcp

.PHONY: e2e-rest
e2e-rest: ## End-to-end REST game API flow (OpenAPI path, e.g. Meta Muse) against URL
	node scripts/rest-e2e.mjs $(URL)

.PHONY: e2e-mcp-local
e2e-mcp-local: ## E2E against the local MCP worker directly
	node scripts/mcp-e2e.mjs http://localhost:$(MCP_PORT)/mcp

## ---------- Mobile (SwiftUI · Compose · KMP) ----------

# Per-app Makefiles: `make android-<target>` / `make ios-<target>` forward to apps/android and apps/ios
# (e.g. make android-run, make ios-run LOCAL=1). Explicit targets below take precedence.
android-%:
	@$(MAKE) --no-print-directory -C $(ANDROID) $*

ios-%:
	@$(MAKE) --no-print-directory -C $(IOS) $*

.PHONY: android-help
android-help: ## Android targets (build, release, bundle, test, ui-test, run, emulator, sha, …)
	@$(MAKE) --no-print-directory -C $(ANDROID) help

.PHONY: ios-help
ios-help: ## iOS targets (build, archive, test, ui-test, run, sim, logs, …)
	@$(MAKE) --no-print-directory -C $(IOS) help

.PHONY: fixtures
fixtures: ## Regenerate engine fixtures shared with the Kotlin port (after engine changes)
	npm run fixtures -w @padel/engine

.PHONY: native-assets
native-assets: ## Generate Swift/Kotlin tokens, icons and fonts from packages/design
	npm run native -w @padel/design

.PHONY: mobile-test
mobile-test: ## Kotlin engine vs shared fixtures on JVM + iOS simulator, Android unit tests
	cd $(SHARED) && ./gradlew jvmTest iosSimulatorArm64Test --console=plain
	cd $(ANDROID) && ./gradlew :app:testDebugUnitTest --console=plain

.PHONY: ios-project
ios-project: ## Generate apps/ios/Padel.xcodeproj (XcodeGen) and open it
	cd $(IOS) && xcodegen generate && open Padel.xcodeproj

.PHONY: ios-test
ios-test: ## Build the iOS app and run its tests on IOS_SIM
	cd $(IOS) && xcodegen generate --quiet && xcodebuild test -project Padel.xcodeproj -scheme Padel \
		-destination "platform=iOS Simulator,name=$(IOS_SIM)" -derivedDataPath build/dd -quiet

.PHONY: ios-screenshots
ios-screenshots: ## App Store screenshots (6.9", 6.5", iPad 13") into store/ios
	scripts/ios-screenshots.sh

.PHONY: ios-ui-test
ios-ui-test: ## iOS UI tests against the deployed API (create, score, join by link, web sync)
	cd $(IOS) && xcodegen generate --quiet && xcodebuild test -project Padel.xcodeproj -scheme Padel \
		-destination "platform=iOS Simulator,name=$(IOS_SIM)" -derivedDataPath build/dd -only-testing:PadelUITests -quiet

.PHONY: android-screenshots
android-screenshots: ## Play Store screenshots (phone, 7" and 10" tablet) into store/android
	scripts/android-screenshots.sh

.PHONY: android-ui-test
android-ui-test: ## Android instrumented tests against the deployed API (needs a running emulator)
	cd $(ANDROID) && ./gradlew :app:connectedDebugAndroidTest --console=plain -Pandroid.testInstrumentationRunnerArguments.class=app.padel.android.PadelFlowTest

.PHONY: e2e-local
e2e-local: ## Apps end-to-end on the local stack (needs make dev + an Android emulator): iOS, Android, cross-device
	scripts/e2e-local.sh

.PHONY: android
android: ## Build the Android debug APK and install it on a running device/emulator
	cd $(ANDROID) && ./gradlew :app:installDebug --console=plain

.PHONY: android-build
android-build: ## Build the Android debug APK
	cd $(ANDROID) && ./gradlew :app:assembleDebug --console=plain

## ---------- Build ----------

.PHONY: build
build: build-web ## Build everything deployable

.PHONY: build-web
build-web: ## Next.js build adapted for Workers (.open-next/)
	cd $(WEB) && $(OPENNEXT) build

.PHONY: dry-run
dry-run: ## Bundle both workers without deploying (size + config check)
	cd $(MCP) && $(WRANGLER) deploy --dry-run --outdir .wrangler/dry-run
	cd $(WEB) && $(OPENNEXT) build && $(WRANGLER) deploy --dry-run

## ---------- Deploy ----------

.PHONY: deploy
deploy: check deploy-mcp deploy-web smoke-prod ## Check, deploy MCP then web, smoke-test production

.PHONY: deploy-mcp
deploy-mcp: ## Deploy the MCP worker (must exist before web: service binding)
	cd $(MCP) && $(WRANGLER) deploy --message "$(GIT_SHA)"

.PHONY: deploy-web
deploy-web: build-web ## Build and deploy the web worker
	cd $(WEB) && $(OPENNEXT) deploy

.PHONY: deploy-fast
deploy-fast: deploy-mcp deploy-web ## Deploy both without running checks

.PHONY: smoke-prod
smoke-prod: ## Smoke + MCP and REST e2e against production
	./scripts/smoke.sh $(PROD_URL)
	node scripts/mcp-e2e.mjs $(PROD_URL)/mcp
	node scripts/rest-e2e.mjs $(PROD_URL)

.PHONY: release
release: ## Check, deploy, then tag + push: make release TAG=v0.4.0
	@test -n "$(TAG)" || (echo "Usage: make release TAG=vX.Y.Z" && exit 1)
	@test -z "$$(git status --porcelain)" || (echo "Working tree not clean" && exit 1)
	$(MAKE) deploy
	git push
	git tag -a $(TAG) -m "$(TAG)"
	git push origin $(TAG)

## ---------- Operate ----------

.PHONY: logs-web
logs-web: ## Live logs from the web worker
	cd $(WEB) && $(WRANGLER) tail padel-web --format pretty

.PHONY: logs-mcp
logs-mcp: ## Live logs from the MCP worker
	cd $(MCP) && $(WRANGLER) tail padel-mcp --format pretty

.PHONY: versions
versions: ## Recent versions and deployments of both workers
	cd $(WEB) && $(WRANGLER) deployments list --name padel-web | tail -24
	cd $(MCP) && $(WRANGLER) deployments list --name padel-mcp | tail -24

.PHONY: rollback-web
rollback-web: ## Roll the web worker back to its previous version
	cd $(WEB) && $(WRANGLER) rollback --name padel-web

.PHONY: rollback-mcp
rollback-mcp: ## Roll the MCP worker back to its previous version
	cd $(MCP) && $(WRANGLER) rollback --name padel-mcp

.PHONY: secret-web
secret-web: ## Set a web worker secret: make secret-web NAME=REVALIDATE_SECRET
	@test -n "$(NAME)" || (echo "Usage: make secret-web NAME=..." && exit 1)
	cd $(WEB) && $(WRANGLER) secret put $(NAME)

.PHONY: secret-mcp
secret-mcp: ## Set an MCP worker secret: make secret-mcp NAME=TOKEN_ENC_KEY
	@test -n "$(NAME)" || (echo "Usage: make secret-mcp NAME=..." && exit 1)
	cd $(MCP) && $(WRANGLER) secret put $(NAME)

## ---------- Clean ----------

.PHONY: clean
clean: ## Remove build output and local wrangler state
	rm -rf $(WEB)/.next $(WEB)/.open-next $(WEB)/.wrangler $(MCP)/.wrangler

.PHONY: clean-all
clean-all: clean ## Also remove node_modules
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
