# 月影灵编 · Codex 皮肤（macOS）

为 **Codex Desktop 官方客户端**制作的非官方 macOS 皮肤。安装包已经预置「月影灵编」原创主题：月夜竹影、灵兽编程与青紫月光配色；安装后即可应用，也仍可继续用上游的主题定制功能替换图片与颜色。

本发行版直接基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 源码的 commit `568469a4` 定制，保留其完整 CDP 注入器、原生界面保护、验证、暂停与恢复机制。上游源码采用 MIT License；本目录继续保留原始 `LICENSE` 与来源说明 `NOTICE.md`。

它会把主题图应用为 Codex 首页横幅与低干扰任务背景，同时**保留原生侧栏、建议卡片、项目选择器、任务内容、菜单和输入框的完整交互**。

This project injects through **local loopback CDP**. It does **not** modify the official `.app`, `app.asar`, or code signature.

> Not affiliated with OpenAI. Codex is a trademark of its respective owners.

## Requirements

- macOS
- Official Codex Desktop installed and launched at least once (`~/.codex/config.toml` exists)
- No global Node.js install required (uses Codex’s signed bundled Node after validation)

## Quick start (from this repo)

```bash
# 1) Optional static checks (needs Codex.app present for bundled Node path)
./tests/run-tests.sh

# 2) Install to the stable path and create Desktop launchers (without auto-start)
./scripts/install-dream-skin-macos.sh --no-launch

# 3) 运行桌面「Codex Dream Skin.command」即可应用预置的「月影灵编」；
#    如需更换自己的图片，可再运行
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh

# 4) Start / re-apply, verify, or restore via Desktop:
#    Codex Dream Skin.command
#    Codex Dream Skin - Customize.command
#    Codex Dream Skin - Verify.command
#    Codex Dream Skin - Restore.command

# 5) Optional: menu bar (SwiftBar) — apply / pause / change image
./Install\ Menu\ Bar.command
# Look for 🎨 Skin in the top-right menu bar
```

Install location after step 2:

| Item | Path |
| --- | --- |
| Engine | `~/.codex/codex-dream-skin-studio` |
| State / logs / user images | `~/Library/Application Support/CodexDreamSkinStudio` |
| Theme backup | under Application Support (`theme-backup.json`) |

## Customer ZIP (maintainer source checkout only)

The customer runtime intentionally excludes release builders and maintainer-only QA history. From the complete maintainer source checkout, build the “double-click install” layout with:

```bash
./scripts/build-client-release.sh "$HOME/Desktop/月影灵编-Codex皮肤-macOS.zip"
```

That command creates the ZIP plus a `.sha256` sidecar. The ZIP contains a visible installer, `ARTWORK-LICENSE.md`, and a runtime-only hidden `.codex-dream-skin-studio` engine. Do not ship only CSS/images.

## How it works (security boundary)

1. Discover `com.openai.codex` and validate signature / Team ID / arch / bundled Node.
2. Start Codex via user `launchd` with CDP bound to `127.0.0.1` only.
3. Accept the debug port only when it belongs to Codex (or a legitimate child).
4. Inject only into expected `app://` renderer targets.
5. Keep a small injector alive across reloads and route changes.
6. Restore stops the injector only when PID, path, and start time match the recorded job.

CDP is powerful and unauthenticated on loopback. Prefer Restore when you are done theming.

## Image guidelines

- PNG / JPEG / HEIC / TIFF / WebP (macOS readable)
- Source ≤ 50 MB; prepared file ≤ 16 MB
- Wide images work best (width ≥ 2000 px recommended)
- Keep the left side relatively calm for native home titles
- Image is banner + background only — never a full-window fake UI overlay

CLI example:

```bash
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh \
  --image "/path/to/image.png" \
  --name "My theme" \
  --accent "#7cff46" \
  --secondary "#36d7e8" \
  --highlight "#642a8c"
```

恢复到打包内置的「月影灵编」主题：

```bash
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh --reset-demo
```

## License

软件源码采用 MIT License，见 `LICENSE`。内置主题图片不随 MIT 软件许可开放，客户使用范围见 `ARTWORK-LICENSE.md`；该文件是发布前仍需按实际销售主体完善的 Beta 模板。来源、商标、素材与运行时说明见 `NOTICE.md`。

## What this is not

- Not an OpenAI product and not a fork of Codex source
- Not a way to patch or rebrand the official binary
- Not a Windows build (see `../windows/`)
- Not an API proxy: theming does not change model providers or API keys

If you use a third-party API relay, configure it separately — keep theme install and API config as two explicit steps.
