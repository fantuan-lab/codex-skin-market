#!/bin/bash

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

PORT=9341
CREATE_LAUNCHERS="true"
LAUNCH_AFTER_INSTALL="true"
IN_PLACE="false"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --port) PORT="${2:-}"; shift 2 ;;
    --no-launchers) CREATE_LAUNCHERS="false"; shift ;;
    --no-launch) LAUNCH_AFTER_INSTALL="false"; shift ;;
    --in-place) IN_PLACE="true"; shift ;;
    *) fail "Unknown installer argument: $1" ;;
  esac
done
case "$PORT" in ''|*[!0-9]*) fail "Invalid port: $PORT" ;; esac
[ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || fail "Port must be between 1024 and 65535."

discover_codex_app
require_macos_runtime
ensure_state_root
[ -f "$CONFIG_PATH" ] || fail "Codex config not found: $CONFIG_PATH. Launch Codex once, close it, and rerun the installer."
"$NODE" "$INJECTOR" --check-payload >/dev/null \
  || fail "The Bamboo Panda source payload failed validation; the installed engine was not changed."

deploy_project() {
  local temporary="$INSTALL_ROOT.installing.$$"
  local previous="$INSTALL_ROOT.previous.$$"
  /bin/rm -rf "$temporary" "$previous"
  /bin/mkdir -p "$temporary"
  /usr/bin/rsync -a \
    --exclude '.git/' \
    --exclude '.DS_Store' \
    --exclude 'release/' \
    --exclude 'dist/' \
    --exclude 'runtime/' \
    "$PROJECT_ROOT/" "$temporary/"
  /bin/chmod 700 "$temporary"/*.command "$temporary"/scripts/*.sh 2>/dev/null || true
  if ! "$NODE" "$temporary/scripts/injector.mjs" --check-payload >/dev/null; then
    /bin/rm -rf "$temporary"
    fail "The staged Bamboo Panda payload failed validation; the installed engine was not changed."
  fi
  if [ -e "$INSTALL_ROOT" ]; then /bin/mv "$INSTALL_ROOT" "$previous"; fi
  if ! /bin/mv "$temporary" "$INSTALL_ROOT"; then
    [ -e "$previous" ] && /bin/mv "$previous" "$INSTALL_ROOT"
    fail "Could not install the project at $INSTALL_ROOT"
  fi
  /bin/rm -rf "$previous"
}

if [ "$IN_PLACE" = "false" ] && [ "$PROJECT_ROOT" != "$INSTALL_ROOT" ]; then
  /bin/mkdir -p "$(dirname "$INSTALL_ROOT")"
  deploy_project
  install_args=(--in-place --port "$PORT")
  [ "$CREATE_LAUNCHERS" = "true" ] || install_args+=(--no-launchers)
  [ "$LAUNCH_AFTER_INSTALL" = "true" ] || install_args+=(--no-launch)
  exec "$INSTALL_ROOT/scripts/install-dream-skin-macos.sh" "${install_args[@]}"
fi

if [ -f "$STATE_PATH" ]; then
  stop_recorded_injector || fail "The recorded skin injector identity could not be verified; installation stopped without killing it."
fi
/bin/rm -f "$STATE_PATH"
"$SCRIPT_DIR/activate-bundled-panda-macos.sh"
"$NODE" "$INJECTOR" --check-payload --theme-dir "$THEME_DIR" >/dev/null
"$NODE" "$SCRIPT_DIR/theme-config.mjs" install "$CONFIG_PATH" "$THEME_BACKUP_PATH"

shell_quote() {
  "$NODE" -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

write_launcher() {
  local target="$1"
  local command="$2"
  if [ -e "$target" ] && ! /usr/bin/grep -q '^# CodexDreamSkinStudio launcher$' "$target" 2>/dev/null; then
    fail "Refusing to overwrite an unrelated Desktop file: $target"
  fi
  /usr/bin/printf '%s\n' \
    '#!/bin/bash' \
    '# CodexDreamSkinStudio launcher' \
    'set -e' \
    "$command" > "$target"
  /bin/chmod 700 "$target"
}

if [ "$CREATE_LAUNCHERS" = "true" ]; then
  /bin/mkdir -p "$HOME/Desktop"
  start_script="$(shell_quote "$SCRIPT_DIR/start-dream-skin-macos.sh")"
  customize_script="$(shell_quote "$SCRIPT_DIR/customize-theme-macos.sh")"
  verify_script="$(shell_quote "$SCRIPT_DIR/verify-dream-skin-macos.sh")"
  restore_script="$(shell_quote "$SCRIPT_DIR/restore-dream-skin-macos.sh")"
  screenshot="$(shell_quote "$HOME/Desktop/竹影熊猫 Codex 验证.png")"
  write_launcher "$HOME/Desktop/竹影熊猫 Codex.command" "exec $start_script --port $PORT --prompt-restart"
  write_launcher "$HOME/Desktop/竹影熊猫 Codex - 定制.command" "exec $customize_script"
  write_launcher "$HOME/Desktop/竹影熊猫 Codex - 验证.command" "$verify_script --screenshot $screenshot && /usr/bin/open $screenshot"
  write_launcher "$HOME/Desktop/竹影熊猫 Codex - 恢复.command" "exec $restore_script --restore-base-theme --restart-codex"
fi

printf '竹影熊猫 %s 已安装到 %s；Codex %s，使用其签名 Node.js %s。\n' \
  "$SKIN_VERSION" "$PROJECT_ROOT" "$CODEX_VERSION" "$NODE_VERSION"
printf '请使用桌面的竹影熊猫入口启动、定制、验证或恢复官方外观。\n'

if [ "$LAUNCH_AFTER_INSTALL" = "true" ]; then
  "$SCRIPT_DIR/start-dream-skin-macos.sh" --port "$PORT" --prompt-restart
fi
