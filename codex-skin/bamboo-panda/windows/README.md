# Codex 竹影熊猫（Windows）

「竹影熊猫」是一款非官方 Codex 桌面皮肤，基于开源项目 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 的 Windows 注入引擎制作。它通过仅监听本机回环地址的 Chromium DevTools Protocol（CDP）把 CSS 和装饰层注入官方 Codex 渲染器，不修改 `WindowsApps`、`app.asar`、账号、任务或插件。

> 非 OpenAI 官方产品，与 OpenAI 无隶属、赞助或背书关系。Codex 等商标归其权利人所有。

## 运行要求

- Windows 10/11（x64 或 arm64，以官方 Codex 支持范围为准）
- 从 Microsoft Store 安装的官方 Codex，包名必须是 `OpenAI.Codex`
- 已启动并登录过一次，且 `%USERPROFILE%\.codex\config.toml` 已存在
- 默认使用 `127.0.0.1:9335`

启动器优先使用官方 Codex 包内随附的 `cua_node\bin\node.exe`。仅在旧版 Codex 缺少该运行时时才回退到兼容的系统 Node.js 22+。

## 下载后怎么安装

1. 把 ZIP **完整解压**到普通文件夹；不要直接在压缩包预览窗口中运行。
2. 双击 `Install Bamboo Panda.cmd`。安装器会：
   - 停止同一兼容槽中记录的旧皮肤监视器；
   - 把运行文件复制到 `%LOCALAPPDATA%\CodexMoonSpirit\app`；
   - 首次安装时备份 Codex 桌面外观配置；
   - 把 `appearanceTheme` 设为 `light`；
   - 创建桌面与开始菜单快捷方式。
3. 双击桌面上的 `Codex 竹影熊猫`。若 Codex 已打开，启动器会先关闭并重新启动**官方 Store Codex 进程**，使 9335 调试参数生效。
4. 双击 `Verify Bamboo Panda.cmd` 检查主题图资源、侧栏、输入框、版本和主题 ID；当 Codex 正在首页时，还会检查横幅背景与尺寸。
5. 双击 `Restore Bamboo Panda.cmd` 停止皮肤、恢复安装前的 Codex 桌面主题，并在 Codex 当时处于打开状态时重新启动官方应用以立即加载原主题。

根目录的 Start、Verify 和 Restore 入口只会转发到稳定安装目录；未安装时会拒绝从解压目录启动注入器。

## 单一活动皮肤槽

本包沿用 `%LOCALAPPDATA%\CodexMoonSpirit` 和端口 `9335` 作为兼容槽。安装新的主题会替换该槽中的运行文件，并在替换前按 PID、Node 路径、注入脚本路径、命令行与启动时间核验并停止已记录监视器，避免两个主题同时修改一个 Codex 窗口。

## 皮肤配置

- `assets/theme.json`：名称、文案、色板与图片文件名
- `assets/panda-reference.png`：原创熊猫竹林横幅
- `assets/dream-skin.css`：奶油白、竹叶绿侧栏、横幅、原生建议卡、项目选择器与输入框样式
- `assets/renderer-inject.js`：幂等 DOM 集成、路由/刷新重注入与清理
- `scripts/injector.mjs`：CDP 连接、注入、验证、截图与移除

静态检查：

```powershell
$packageRoot = "完整解压目录"
$package = Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
$node = Join-Path $package.InstallLocation 'app\resources\cua_node\bin\node.exe'
& $node "$packageRoot\tests\static-check.mjs"
```

生成发布 ZIP：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\build-release.ps1"
```

macOS/Linux 构建机可运行 `./scripts/build-release.sh`，两种脚本都会先执行静态检查，再生成 ZIP、测试 CRC 并输出 SHA-256。

## 安全边界

- 只发现 Microsoft Store 注册的 `OpenAI.Codex`，并从动态安装目录启动 `app\ChatGPT.exe`。
- CDP 显式绑定 `127.0.0.1`；注入器拒绝非回环地址、端口不一致、非 `app://` 或缺少 Codex 主界面标记的目标。
- 只停止与状态文件中 PID、Node 路径、脚本路径、命令行和启动时间全部匹配的注入器。
- 装饰层使用 `pointer-events: none`，真实 Codex 按钮、导航、项目选择器和输入框保持可交互。
- CDP 本身没有认证。皮肤运行时不要执行不可信本地软件；不用时请运行恢复入口并退出 Codex，使调试端口关闭。

## 状态与日志

| 内容 | 路径 |
| --- | --- |
| 稳定安装目录 | `%LOCALAPPDATA%\CodexMoonSpirit\app` |
| 状态文件 | `%LOCALAPPDATA%\CodexMoonSpirit\state.json` |
| 标准日志 | `%LOCALAPPDATA%\CodexMoonSpirit\injector.log` |
| 错误日志 | `%LOCALAPPDATA%\CodexMoonSpirit\injector-error.log` |
| 首次安装前配置备份 | `%LOCALAPPDATA%\CodexMoonSpirit\config.before-dream-skin.toml` |

## 测试边界

本目录可在非 Windows 构建机完成 Node 语法、主题载荷、图片哈希、安装/恢复脚本文本与发布清单静态检查。PowerShell 执行、Microsoft Store 实际路径、快捷方式、浅色主题切换和真实 Codex 界面仍需在 Windows 10/11 真机按 `references/qa-inventory.md` 验收。

## 来源与许可

衍生自上游 commit `568469a4`。软件源码使用 MIT License，详情见 `LICENSE`、`NOTICE.md` 与 `SOURCE.md`。熊猫横幅不属于 MIT 软件授权，其 Beta 客户使用范围见 `ARTWORK-LICENSE.md`。
