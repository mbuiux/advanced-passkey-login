#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_SLUG="advanced-passkey-login"
DIST_DIR="$PLUGIN_ROOT/dist"
DISTIGNORE_FILE="$PLUGIN_ROOT/.distignore"
MAIN_PLUGIN_FILE="$PLUGIN_ROOT/advanced-passkey-login.php"

if [[ ! -f "$MAIN_PLUGIN_FILE" ]]; then
  echo "Error: main plugin file not found at $MAIN_PLUGIN_FILE" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"

VERSION="$(grep -m1 '^ \* Version:' "$MAIN_PLUGIN_FILE" | sed -E 's/^ \* Version:[[:space:]]*//')"
VERSION="${VERSION:-dev}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_BASENAME="$PLUGIN_SLUG-$VERSION-$STAMP.zip"
ZIP_PATH="$DIST_DIR/$ZIP_BASENAME"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

STAGE_DIR="$TMP_DIR/$PLUGIN_SLUG"
mkdir -p "$STAGE_DIR"

RSYNC_ARGS=(
  -a
  --delete
  --exclude "dist/"
)

if [[ -f "$DISTIGNORE_FILE" ]]; then
  RSYNC_ARGS+=(--exclude-from "$DISTIGNORE_FILE")
fi

rsync "${RSYNC_ARGS[@]}" "$PLUGIN_ROOT/" "$STAGE_DIR/"

(
  cd "$TMP_DIR"
  zip -r "$ZIP_PATH" "$PLUGIN_SLUG" >/dev/null
)

echo "Created installable zip: $ZIP_PATH" >&2
echo "$ZIP_PATH"
