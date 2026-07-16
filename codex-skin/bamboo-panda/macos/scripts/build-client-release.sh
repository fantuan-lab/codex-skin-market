#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT="${1:-$HOME/Desktop/竹影熊猫-Codex皮肤-macOS.zip}"
TMP="$(/usr/bin/mktemp -d /tmp/codex-bamboo-panda-client.XXXXXX)"
CLIENT_ROOT="$TMP/竹影熊猫 Codex 皮肤"
ENGINE="$CLIENT_ROOT/.codex-dream-skin-studio"
trap '/bin/rm -rf "$TMP"' EXIT

"$ROOT/tests/run-tests.sh"
/bin/mkdir -p "$ENGINE"

# Customer builds use an explicit runtime allow-list. Maintainer-only history,
# acceptance evidence, agent metadata, Skill docs, and release builders stay out.
for file in CHANGELOG.md LICENSE NOTICE.md ARTWORK-LICENSE.md README.md VERSION package.json; do
  [ -f "$ROOT/$file" ] || { printf 'Missing release file: %s\n' "$file" >&2; exit 1; }
  /bin/cp -p "$ROOT/$file" "$ENGINE/$file"
done
for dir in assets menubar tests; do
  /bin/mkdir -p "$ENGINE/$dir"
  /usr/bin/rsync -a "$ROOT/$dir/" "$ENGINE/$dir/"
done
/bin/mkdir -p "$ENGINE/scripts"
/usr/bin/rsync -a \
  --exclude 'build-client-release.sh' \
  --exclude 'build-release.sh' \
  "$ROOT/scripts/" "$ENGINE/scripts/"
for command in \
  "安装竹影熊猫.command" \
  "启动竹影熊猫.command" \
  "定制竹影熊猫.command" \
  "验证竹影熊猫.command" \
  "恢复竹影熊猫.command" \
  "安装竹影熊猫菜单栏.command"; do
  [ -f "$ROOT/$command" ] || { printf 'Missing launcher: %s\n' "$command" >&2; exit 1; }
  /bin/cp -p "$ROOT/$command" "$ENGINE/$command"
done

/usr/bin/printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  'ROOT="$(cd "$(dirname "$0")" && pwd -P)"' \
  'exec "$ROOT/.codex-dream-skin-studio/scripts/install-dream-skin-macos.sh"' \
  > "$CLIENT_ROOT/安装竹影熊猫.command"

/usr/bin/printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  'ROOT="$(cd "$(dirname "$0")" && pwd -P)"' \
  'VERIFY="$HOME/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh"' \
  '[ -x "$VERIFY" ] || VERIFY="$ROOT/.codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh"' \
  'OUTPUT="$HOME/Desktop/竹影熊猫 Codex 验证.png"' \
  '[ -x "$VERIFY" ] || { printf "请先运行安装竹影熊猫.command。\\n" >&2; exit 1; }' \
  '"$VERIFY" --reload --screenshot "$OUTPUT"' \
  '/usr/bin/open "$OUTPUT"' \
  > "$CLIENT_ROOT/验证竹影熊猫.command"

/usr/bin/printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  'ROOT="$(cd "$(dirname "$0")" && pwd -P)"' \
  'RESTORE="$HOME/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh"' \
  '[ -x "$RESTORE" ] || RESTORE="$ROOT/.codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh"' \
  '[ -x "$RESTORE" ] || { printf "没有找到已安装的竹影熊猫。\\n" >&2; exit 1; }' \
  'exec "$RESTORE" --restore-base-theme --restart-codex' \
  > "$CLIENT_ROOT/恢复Codex原界面.command"

/usr/bin/printf '%s\n' \
  '竹影熊猫 · Codex 皮肤（macOS）' \
  '' \
  '交付压缩包：竹影熊猫-Codex皮肤-macOS.zip' \
  '' \
  '本皮肤基于 Fei-Away/Codex-Dream-Skin commit 568469a4，保留上游 MIT License 与完整安装、验证、恢复机制。' \
  '' \
  '双击“安装竹影熊猫.command”。安装器会先备份当前活动主题，再应用预置熊猫主题；桌面同时出现启动、定制、验证和恢复四个入口。' \
  '安装后也可以直接双击同目录的“验证竹影熊猫.command”；需要恢复时双击“恢复Codex原界面.command”。' \
  '' \
  '如果 macOS 提示无法验证开发者或阻止打开：请在 Finder 中右键（或按住 Control 点击）“安装竹影熊猫.command”，选择“打开”，再确认“打开”。不要关闭 Gatekeeper。' \
  '' \
  '不要只复制图片或 CSS。隐藏目录 .codex-dream-skin-studio 是完整运行引擎，请勿删除。' \
  '使用内置主题图片前，请阅读同目录 ARTWORK-LICENSE.md；公开 Beta 用户可免费安装、使用并分享完整未修改安装包。' \
  > "$CLIENT_ROOT/使用说明.txt"

/bin/cp "$ROOT/CLIENT_DEPLOY_PROMPT.md" "$CLIENT_ROOT/给 Codex 的部署提示词.md"
/bin/cp "$ROOT/ARTWORK-LICENSE.md" "$CLIENT_ROOT/ARTWORK-LICENSE.md"
/bin/chmod 755 \
  "$CLIENT_ROOT/安装竹影熊猫.command" \
  "$CLIENT_ROOT/验证竹影熊猫.command" \
  "$CLIENT_ROOT/恢复Codex原界面.command"
/bin/chmod 755 "$ENGINE"/*.command "$ENGINE"/scripts/*.sh "$ENGINE"/tests/*.sh
/usr/bin/xattr -cr "$CLIENT_ROOT"
/usr/bin/find "$CLIENT_ROOT" -type f \( -name '.DS_Store' -o -name '._*' \) -delete
/bin/mkdir -p "$(dirname "$OUTPUT")"
/bin/rm -f "$OUTPUT" "$OUTPUT.sha256"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr "$CLIENT_ROOT" "$OUTPUT"
ARCHIVE_CHECK="$TMP/archive-check"
/bin/mkdir -p "$ARCHIVE_CHECK"
/usr/bin/ditto -x -k "$OUTPUT" "$ARCHIVE_CHECK"
/usr/bin/python3 - "$ARCHIVE_CHECK" <<'PY'
import os
import pathlib
import sys
import unicodedata

base = pathlib.Path(sys.argv[1])
roots = [path for path in base.iterdir() if path.is_dir()]
if len(roots) != 1:
    raise SystemExit("client archive must contain exactly one top-level directory")
root = roots[0]
files = {unicodedata.normalize("NFC", path.name): path for path in root.iterdir() if path.is_file()}
required = {"安装竹影熊猫.command", "验证竹影熊猫.command", "恢复Codex原界面.command"}
missing = sorted(required - files.keys())
if missing:
    raise SystemExit(f"client archive missing top-level wrappers: {missing}")
for name in required:
    if not os.access(files[name], os.X_OK):
        raise SystemExit(f"client archive wrapper is not executable: {name}")
for name in ("验证竹影熊猫.command", "恢复Codex原界面.command"):
    source = files[name].read_text(encoding="utf-8")
    installed = '$HOME/.codex/codex-dream-skin-studio/scripts/'
    bundled = '$ROOT/.codex-dream-skin-studio/scripts/'
    if installed not in source or bundled not in source or source.index(installed) > source.index(bundled):
        raise SystemExit(f"{name} must prefer the installed engine before the bundled fallback")
PY
SHA256="$(/usr/bin/shasum -a 256 "$OUTPUT" | /usr/bin/awk '{print $1}')"
/usr/bin/printf '%s  %s\n' "$SHA256" "$(basename "$OUTPUT")" > "$OUTPUT.sha256"
/usr/bin/printf 'Created %s\nSHA-256 %s\nSidecar %s\n' "$OUTPUT" "$SHA256" "$OUTPUT.sha256"
