#!/bin/bash

# Preserve the current shared-slot theme, register Bamboo Panda in the theme
# library, then atomically make it the active theme. This script intentionally
# keeps the generic Codex Dream Skin runtime paths so all downloadable skins use
# one active injector instead of competing with each other.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
STATE_ROOT="${CODEX_DREAM_SKIN_STATE_ROOT:-$HOME/Library/Application Support/CodexDreamSkinStudio}"
THEME_DIR="$STATE_ROOT/theme"
THEMES_ROOT="$STATE_ROOT/themes"
PANDA_THEME_ID="bamboo-panda-2026"
PANDA_THEME_NAME="竹影熊猫"
ASSETS_ROOT="$PROJECT_ROOT/assets"
NODE="${NODE:-}"

[ -n "$NODE" ] && [ -x "$NODE" ] || {
  printf '竹影熊猫：需要由安装器提供 Codex 自带的 Node.js。\n' >&2
  exit 1
}
[ -s "$ASSETS_ROOT/theme.json" ] || { printf '缺少熊猫主题配置。\n' >&2; exit 1; }
[ -s "$ASSETS_ROOT/panda-hero.png" ] || { printf '缺少熊猫主题图片。\n' >&2; exit 1; }

BUNDLED_ID="$($NODE -e '
  const fs = require("node:fs");
  const theme = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (theme.schemaVersion !== 1 || theme.id !== process.argv[2] || theme.name !== process.argv[3] || theme.image !== "panda-hero.png") process.exit(1);
  process.stdout.write(theme.id);
' "$ASSETS_ROOT/theme.json" "$PANDA_THEME_ID" "$PANDA_THEME_NAME")"
[ "$BUNDLED_ID" = "$PANDA_THEME_ID" ] || { printf '熊猫主题身份校验失败。\n' >&2; exit 1; }

/bin/mkdir -p "$STATE_ROOT" "$THEMES_ROOT"
/bin/chmod 700 "$STATE_ROOT" "$THEMES_ROOT" 2>/dev/null || true

if [ -s "$THEME_DIR/theme.json" ]; then
  ACTIVE_ID="$($NODE -e '
    try {
      const value = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
      process.stdout.write(typeof value.id === "string" ? value.id : "unknown");
    } catch { process.stdout.write("unknown"); }
  ' "$THEME_DIR/theme.json")"
  if [ "$ACTIVE_ID" != "$PANDA_THEME_ID" ]; then
    BACKUP_ID="pre-panda-$(/bin/date -u '+%Y%m%dT%H%M%SZ')-$$"
    BACKUP_ROOT="$THEMES_ROOT/$BACKUP_ID"
    /bin/mkdir -p "$BACKUP_ROOT"
    /usr/bin/rsync -a "$THEME_DIR/" "$BACKUP_ROOT/"
    /bin/chmod 700 "$BACKUP_ROOT" 2>/dev/null || true
    /bin/chmod 600 "$BACKUP_ROOT"/* 2>/dev/null || true
    /usr/bin/printf '%s\n' "$BACKUP_ID" > "$STATE_ROOT/last-pre-panda-theme.txt"
    /bin/chmod 600 "$STATE_ROOT/last-pre-panda-theme.txt"
    printf '已把原活动主题备份为 %s。\n' "$BACKUP_ID"
  fi
fi

PRESET_ROOT="$THEMES_ROOT/$PANDA_THEME_ID"
PRESET_TMP="$THEMES_ROOT/.${PANDA_THEME_ID}.installing.$$"
ACTIVE_TMP="$STATE_ROOT/.theme.installing.$$"
ACTIVE_OLD="$STATE_ROOT/.theme.previous.$$"
cleanup() {
  /bin/rm -rf "$PRESET_TMP" "$ACTIVE_TMP" "$ACTIVE_OLD"
}
trap cleanup EXIT

/bin/rm -rf "$PRESET_TMP" "$ACTIVE_TMP" "$ACTIVE_OLD"
/bin/mkdir -p "$PRESET_TMP" "$ACTIVE_TMP"
/bin/cp -p "$ASSETS_ROOT/theme.json" "$ASSETS_ROOT/panda-hero.png" "$PRESET_TMP/"
/bin/chmod 600 "$PRESET_TMP/theme.json" "$PRESET_TMP/panda-hero.png"
/bin/rm -rf "$PRESET_ROOT"
/bin/mv "$PRESET_TMP" "$PRESET_ROOT"

/usr/bin/rsync -a "$PRESET_ROOT/" "$ACTIVE_TMP/"
if [ -e "$THEME_DIR" ]; then /bin/mv "$THEME_DIR" "$ACTIVE_OLD"; fi
if ! /bin/mv "$ACTIVE_TMP" "$THEME_DIR"; then
  [ -e "$ACTIVE_OLD" ] && /bin/mv "$ACTIVE_OLD" "$THEME_DIR"
  printf '竹影熊猫：无法激活熊猫主题。\n' >&2
  exit 1
fi
/bin/rm -rf "$ACTIVE_OLD"
/bin/chmod 700 "$THEME_DIR"
/bin/chmod 600 "$THEME_DIR/theme.json" "$THEME_DIR/panda-hero.png"
trap - EXIT

printf '竹影熊猫已写入共享主题槽。\n'
