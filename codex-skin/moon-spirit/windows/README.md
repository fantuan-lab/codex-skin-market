# Codex 月影灵编（Windows）

「月影灵编」是基于开源项目 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 制作的原创 Codex 桌面皮肤。它使用本机回环地址上的 Chromium DevTools Protocol（CDP）把 CSS 与装饰层注入官方 Codex 渲染器，不修改 `WindowsApps`、`app.asar`、账号、任务或插件。

> 非 OpenAI 官方产品，与 OpenAI 无隶属、赞助或背书关系。Codex 等商标归其权利人所有。

## 运行要求

- Windows 10/11（x64 或 arm64，以官方 Codex 支持范围为准）
- 从 Microsoft Store 安装的官方 Codex，包名必须是 `OpenAI.Codex`
- 已启动并登录过一次，且 `%USERPROFILE%\.codex\config.toml` 已存在
- 默认使用 `127.0.0.1:9335`；如端口冲突，可在 PowerShell 中用同一个 `-Port` 参数运行安装、启动、验证与恢复脚本

启动器优先使用官方 Codex 包内随附的 `cua_node\bin\node.exe`。仅在旧版 Codex 缺少该运行时时才回退到系统 Node.js。

## 最快安装

1. 解压 ZIP，保留完整目录结构。
2. 双击 `Install Moon Spirit.cmd`。安装器会把运行文件复制到 `%LOCALAPPDATA%\CodexMoonSpirit\app`，备份现有 Codex 基础配色，并创建桌面快捷方式。
3. 安装成功后，双击桌面上的 `Codex 月影灵编`。根目录的 `Start Moon Spirit.cmd`、`Verify Moon Spirit.cmd` 和 `Restore Moon Spirit.cmd` 也只会转发到稳定安装目录；未安装时会直接拒绝运行，不会从解压目录启动注入器。
4. 要检查注入是否完整，双击 `Verify Moon Spirit.cmd`。
5. 要移除实时皮肤，双击 `Restore Moon Spirit.cmd`。若还要恢复安装前基础配色，请运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\CodexMoonSpirit\app\scripts\restore-dream-skin.ps1" -RestoreBaseTheme
```

必须先运行安装入口，再使用启动、验证或恢复入口。启动时如果 Codex 已经打开，入口会重启**官方 Store Codex 进程**，使 CDP 启动参数生效；未匹配官方包路径的同名进程不会被关闭。

## 皮肤配置

- `assets/theme.json`：名称、文案、配色、图片文件名；字段结构与同仓库 macOS 版一致。
- `assets/dream-reference.png`：原创月影灵兽横幅。
- `assets/dream-skin.css`：侧栏、首页横幅、原生建议卡、项目选择器和输入框的完整样式。
- `assets/renderer-inject.js`：幂等 DOM 集成、路由/刷新重注入与清理。
- `scripts/injector.mjs`：CDP 连接、注入、验证、截图和移除。

修改 `theme.json` 或图片后，可先执行不连接 Codex 的静态载荷检查：

```powershell
& "$env:LOCALAPPDATA\CodexMoonSpirit\app\scripts\common-dream-skin.ps1"
$package = Get-OfficialCodexPackage
$node = Get-CodexNodeRuntime $package
& $node "$env:LOCALAPPDATA\CodexMoonSpirit\app\scripts\injector.mjs" --check-payload
```

## 安全边界

- 只发现 Microsoft Store 注册的 `OpenAI.Codex`，并从该包的动态安装目录启动 `app\ChatGPT.exe`。
- CDP 显式绑定 `127.0.0.1`；注入器拒绝非 `127.0.0.1`、端口不一致、非 `app://` 或缺少 Codex 主界面标记的目标。
- 恢复/重启注入器前，同时核验 PID、Node 路径、注入脚本路径、命令行与启动时间，避免 PID 复用导致误杀。
- CDP 本身没有认证。皮肤运行时不要执行不可信本地软件；不用时可运行恢复入口停止皮肤监视器并移除当前渲染器样式。恢复入口不会关闭 Codex，因此调试端口会继续存在，直到 Codex 退出。

## 状态与日志

| 内容 | 路径 |
| --- | --- |
| 稳定安装目录 | `%LOCALAPPDATA%\CodexMoonSpirit\app` |
| 状态文件 | `%LOCALAPPDATA%\CodexMoonSpirit\state.json` |
| 标准日志 | `%LOCALAPPDATA%\CodexMoonSpirit\injector.log` |
| 错误日志 | `%LOCALAPPDATA%\CodexMoonSpirit\injector-error.log` |
| 原配色备份 | `%LOCALAPPDATA%\CodexMoonSpirit\config.before-dream-skin.toml` |

## 测试边界

本发布包已在 macOS 构建机完成 Node 语法、主题载荷、资源引用、ZIP 清单与脚本文本静态检查；当前没有 Windows 真机，因此 PowerShell 执行、Store 包实际路径、快捷方式和真实 Codex 界面仍需在 Windows 10/11 上验收。验收清单见 `references/qa-inventory.md`。

## 来源与许可

衍生自上游 commit `568469a4`。源代码使用 MIT License，详情见 `LICENSE`、`NOTICE.md` 与 `SOURCE.md`。原创月影灵兽图片不属于 MIT 软件授权，其 Beta 客户使用范围见 `ARTWORK-LICENSE.md`。
