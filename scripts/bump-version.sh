#!/usr/bin/env bash
# Sets the mobile app version for a release tag: scripts/bump-version.sh v0.11.0
# version = tag without "v" (must be higher than the current one), build = previous build + 1.
# Updates apps/mobile-version.properties (Android, Wear OS) and apps/ios/project.yml (iOS, watchOS).
set -euo pipefail
cd "$(dirname "$0")/.."

tag="${1:?usage: scripts/bump-version.sh vX.Y.Z}"
[[ "$tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || { echo "Tag must look like v1.2.3, got $tag" >&2; exit 1; }
version="${tag#v}"
# App Store style: v1.1.0 → "1.1", v1.1.2 → "1.1.2".
version="${version%.0}"

props=apps/mobile-version.properties
current=$(sed -n 's/^version=//p' "$props")
# BUILD=N sets the build number (e.g. to line up with App Store Connect); by default it goes up by one.
build="${BUILD:-$(( $(sed -n 's/^build=//p' "$props") + 1 ))}"
[[ "$build" =~ ^[0-9]+$ ]] || { echo "BUILD must be a number, got $build" >&2; exit 1; }

highest=$(printf '%s\n%s\n' "$current" "$version" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
if [ "$version" = "$current" ] || [ "$highest" != "$version" ]; then
  echo "Version $version must be higher than the current $current" >&2
  exit 1
fi

sed -i '' -e "s/^version=.*/version=$version/" -e "s/^build=.*/build=$build/" "$props"
sed -i '' -e "s/^\(    MARKETING_VERSION: \).*/\1\"$version\"/" -e "s/^\(    CURRENT_PROJECT_VERSION: \).*/\1\"$build\"/" apps/ios/project.yml
echo "Mobile apps: version $version, build $build"
