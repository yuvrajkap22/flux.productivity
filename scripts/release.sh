#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   npm run release -- 2.0.1
#   npm run release -- v2.0.1

RAW_VERSION="${1:-}"

if [[ -z "$RAW_VERSION" ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 2.0.1"
  exit 1
fi

TAG="v${RAW_VERSION#v}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: run this script inside a git repository."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: local tag $TAG already exists."
  exit 1
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Error: remote tag $TAG already exists on origin."
  exit 1
fi

echo "Pushing current branch to origin..."
git push origin HEAD

echo "Creating annotated tag $TAG..."
git tag -a "$TAG" -m "Release $TAG"

echo "Pushing tag $TAG to origin..."
git push origin "$TAG"

echo "Release tag pushed: $TAG"
echo "GitHub Actions will publish the release and apply notes from CHANGELOG.md."
