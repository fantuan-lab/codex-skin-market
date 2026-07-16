#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT="${1:-$HOME/Desktop/月影灵编-Codex皮肤-macOS.zip}"
TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-client.XXXXXX)"
CLIENT_ROOT="$TMP/月影灵编 Codex 皮肤"
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
  "Install Codex Dream Skin.command" \
  "Start Codex Dream Skin.command" \
  "Customize Codex Dream Skin.command" \
  "Verify Codex Dream Skin.command" \
  "Restore Codex Dream Skin.command" \
  "Install Menu Bar.command"; do
  [ -f "$ROOT/$command" ] || { printf 'Missing launcher: %s\n' "$command" >&2; exit 1; }
  /bin/cp -p "$ROOT/$command" "$ENGINE/$command"
done

/usr/bin/printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  'ROOT="$(cd "$(dirname "$0")" && pwd -P)"' \
  'exec "$ROOT/.codex-dream-skin-studio/scripts/install-dream-skin-macos.sh"' \
  > "$CLIENT_ROOT/安装月影灵编.command"

/usr/bin/printf '%s\n' \
  '月影灵编 · Codex 皮肤（macOS）' \
  '' \
  '交付压缩包：月影灵编-Codex皮肤-macOS.zip' \
  '' \
  '本皮肤基于 Fei-Away/Codex-Dream-Skin commit 568469a4，保留上游 MIT License 与完整安装、验证、恢复机制。' \
  '' \
  '双击“安装月影灵编.command”。安装完成后会应用预置主题，桌面同时出现启动、定制、验证和恢复四个入口。' \
  '' \
  '如果 macOS 提示无法验证开发者或阻止打开：请在 Finder 中右键（或按住 Control 点击）“安装月影灵编.command”，选择“打开”，再确认“打开”。不要关闭 Gatekeeper。' \
  '' \
  '不要只复制图片或 CSS。隐藏目录 .codex-dream-skin-studio 是完整运行引擎，请勿删除。' \
  '使用内置主题图片前，请阅读同目录 ARTWORK-LICENSE.md；这是仍需发布方完善的 Beta 客户条款。' \
  > "$CLIENT_ROOT/使用说明.txt"

/bin/cp "$ROOT/CLIENT_DEPLOY_PROMPT.md" "$CLIENT_ROOT/给 Codex 的部署提示词.md"
/bin/cp "$ROOT/ARTWORK-LICENSE.md" "$CLIENT_ROOT/ARTWORK-LICENSE.md"
/bin/chmod 755 "$CLIENT_ROOT/安装月影灵编.command"
/bin/chmod 755 "$ENGINE"/*.command "$ENGINE"/scripts/*.sh "$ENGINE"/tests/*.sh
/usr/bin/xattr -cr "$CLIENT_ROOT"
/usr/bin/find "$CLIENT_ROOT" -type f \( -name '.DS_Store' -o -name '._*' \) -delete
/bin/mkdir -p "$(dirname "$OUTPUT")"
/bin/rm -f "$OUTPUT" "$OUTPUT.sha256"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr "$CLIENT_ROOT" "$OUTPUT"
SHA256="$(/usr/bin/shasum -a 256 "$OUTPUT" | /usr/bin/awk '{print $1}')"
/usr/bin/printf '%s  %s\n' "$SHA256" "$(basename "$OUTPUT")" > "$OUTPUT.sha256"
/usr/bin/printf 'Created %s\nSHA-256 %s\nSidecar %s\n' "$OUTPUT" "$SHA256" "$OUTPUT.sha256"
