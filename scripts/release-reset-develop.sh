#!/usr/bin/env bash
#
# release-reset-develop.sh
#
# Run AFTER a `develop -> main` release PR has merged.
#
# Resets the long-lived `develop` integration branch back onto `main` and opens
# the next development cycle by bumping the app version one patch across all
# three packages. This keeps `develop` exactly one version ahead of `main`, which
# is what lets Dependabot PRs pass the Version Bump Check and auto-merge.
#
# Usage:
#   ./scripts/release-reset-develop.sh            # auto-increment patch from main
#   ./scripts/release-reset-develop.sh 1.8.0      # set an explicit next version
#
set -euo pipefail

REMOTE="origin"
PUBLIC_PKG="the-harry-list-public/package.json"
ADMIN_PKG="the-harry-list-admin/package.json"
BACKEND_DIR="the-harry-list-backend"

# Must be run from the repo root
if [ ! -f "$PUBLIC_PKG" ]; then
  echo "error: run this from the repository root (cannot find $PUBLIC_PKG)" >&2
  exit 1
fi

# Refuse to run with uncommitted changes — this script force-moves a branch
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

echo "Fetching $REMOTE ..."
git fetch --quiet "$REMOTE"

# Current version on main is the source of truth
MAIN_VERSION=$(git show "$REMOTE/main:$PUBLIC_PKG" \
  | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version")

# Determine the next version: explicit arg, or patch increment of main's version
if [ "${1:-}" != "" ]; then
  NEXT_VERSION="$1"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$MAIN_VERSION"
  NEXT_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
fi

echo "main is at $MAIN_VERSION — opening develop cycle at $NEXT_VERSION"
read -r -p "Reset '$REMOTE/develop' onto '$REMOTE/main' and bump to $NEXT_VERSION? [y/N] " reply
case "$reply" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

# Recreate develop from the freshly-released main
git switch --quiet --force-create develop "$REMOTE/main"

# Bump all three packages to the same version
echo "Bumping versions ..."
( cd the-harry-list-public && npm version "$NEXT_VERSION" --no-git-tag-version --allow-same-version >/dev/null )
( cd the-harry-list-admin  && npm version "$NEXT_VERSION" --no-git-tag-version --allow-same-version >/dev/null )
( cd "$BACKEND_DIR" && ./mvnw -q versions:set -DnewVersion="$NEXT_VERSION" -DgenerateBackupPoms=false )

git add "$PUBLIC_PKG" "$ADMIN_PKG" "$BACKEND_DIR/pom.xml"
git commit --quiet -m "chore: open $NEXT_VERSION development cycle on develop"

echo
echo "develop reset onto main and bumped to $NEXT_VERSION (committed locally)."
echo "Review, then publish with:"
echo "    git push --force-with-lease $REMOTE develop"
