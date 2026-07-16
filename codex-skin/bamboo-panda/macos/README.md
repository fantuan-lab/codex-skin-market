# 竹影熊猫 · Codex 皮肤（macOS）

为官方 Codex Desktop 制作的非官方主题。它保留 Codex 原生侧边栏、任务、建议卡片和输入框，通过本机回环 CDP 注入竹影熊猫配色与横幅，不修改 `app.asar`。

> 本项目与 OpenAI 无隶属、赞助或背书关系。目前是未签名、未公证的 Beta 包。

## 用户安装

1. 从 GitHub Release 下载 `竹影熊猫-Codex皮肤-macOS.zip` 并解压完整目录。
2. 双击 `安装竹影熊猫.command`。
3. 如果 macOS 首次阻止打开，在 Finder 中右键该文件，选择“打开”，再确认“打开”；不要关闭 Gatekeeper。
4. 安装器会先保存现有活动主题，再激活内置竹影熊猫主题，并临时把 Codex 外观切到浅色。
5. 桌面会生成启动、定制、验证和恢复四个竹影熊猫入口。

客户解压目录顶层同时包含 `验证竹影熊猫.command` 和 `恢复Codex原界面.command`，无需寻找隐藏引擎即可验收或恢复。

要求：macOS、官方 Codex Desktop 已安装且至少启动过一次，`~/.codex/config.toml` 已存在。运行时使用 Codex 自带且通过签名检查的 Node.js，不要求用户安装 Node/npm。

## 安装行为

| 内容 | 路径 |
| --- | --- |
| 共享皮肤引擎 | `~/.codex/codex-dream-skin-studio` |
| 状态、日志与活动主题 | `~/Library/Application Support/CodexDreamSkinStudio` |
| 熊猫主题库 | `.../themes/bamboo-panda-2026` |
| 安装前活动主题备份 | `.../themes/pre-panda-*` |

所有皮肤共用一个活动运行槽和回环端口，避免多个注入器同时修改同一 Codex 页面。安装熊猫包不会删除旧主题，而是把它保存到主题库。

安装器只临时设置 `appearanceTheme = "light"`。桌面“恢复”入口会移除在线皮肤、恢复安装前的 Codex 外观配置并正常重启 Codex。

## 桌面入口

- `竹影熊猫 Codex.command`
- `竹影熊猫 Codex - 定制.command`
- `竹影熊猫 Codex - 验证.command`
- `竹影熊猫 Codex - 恢复.command`

验证截图输出到 `~/Desktop/竹影熊猫 Codex 验证.png`。
当 Codex 正在首页时，验证器会额外检查熊猫横幅的背景资源与尺寸；位于任务页时会明确返回 `homeVerification: not-visible`，只验证主题 ID、图片资源、侧栏、输入框和注入器状态。

## 维护者构建

```bash
cd codex-skin/bamboo-panda/macos
./tests/run-tests.sh
./scripts/build-client-release.sh "$HOME/Desktop/竹影熊猫-Codex皮肤-macOS.zip"
```

构建同时生成 `.sha256`。客户 ZIP 使用运行时白名单，包含可见安装器、使用说明、素材许可和隐藏的完整引擎，不包含维护者验收记录、Agent 元数据或构建脚本。

## 恢复与排错

```bash
~/.codex/codex-dream-skin-studio/scripts/doctor-macos.sh --require-live
~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh --reload \
  --screenshot "$HOME/Desktop/竹影熊猫 Codex 验证.png"
~/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh \
  --restore-base-theme --restart-codex
```

要换成自己的图片，使用桌面“定制”入口。要回到包内置熊猫主题，可删除活动自定义主题后重新运行安装器，或从主题库切换 `bamboo-panda-2026`。

## 安全边界

- 仅连接 `127.0.0.1`/loopback CDP。
- 校验 Codex 应用、内置 Node 签名与 Team ID。
- 不上传账户、对话或项目内容。
- 不替换官方可执行文件，不写入 `app.asar`。
- 完整恢复会验证在线皮肤已移除，再恢复配置。

软件代码继承上游 MIT License；熊猫图片适用单独的 [`ARTWORK-LICENSE.md`](ARTWORK-LICENSE.md)。
