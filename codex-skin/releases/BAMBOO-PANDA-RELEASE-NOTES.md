# Bamboo Panda Beta 1 · 竹影熊猫

> 普通用户只下载下面两个 ZIP 中与自己系统对应的一个。不要下载页面底部 GitHub 自动生成的 `Source code (zip / tar.gz)`。

- macOS：`codex-bamboo-panda-macos-beta1.zip`
- Windows 10 / 11：`codex-bamboo-panda-windows-beta1.zip`
- 校验值：`codex-bamboo-panda-SHA256SUMS.txt`

| 平台 | SHA-256 |
| --- | --- |
| macOS | `c40fcf9110cf64e87b2d2f1f5d5fd92a5540cf3ddc00e4cb5635d7e4bae48701` |
| Windows | `285769eb18ba6321633e3243b8938d1dbd46f52beda230d058c31d5d6f83868d` |

## 怎么安装

1. 下载与系统对应的 ZIP，并完整解压。
2. macOS 双击顶层「安装竹影熊猫.command」；Windows 双击 `Install Bamboo Panda.cmd`。
3. 安装后使用包内的启动、验证和恢复入口。安装另一款 Codex Skin Lab 皮肤会替换当前活动皮肤。

## 这一版有什么

- 网站与 Release 使用市场发布版本 `v0.1.0-beta.1`；安装包内沿用皮肤引擎 `1.2.0` Beta 版本线，Windows 版本号带 `bamboo-panda` 标识。
- 米白、竹青、熊猫和成都意象的首页横幅与主题色。
- 保留 Codex 原生侧栏、任务、建议卡和输入框交互。
- macOS 与 Windows 都提供顶层安装、验证和恢复入口，普通用户无需克隆仓库或手动输入命令。
- 安装时会备份现有主题与桌面外观设置；同一时间只运行一款活动皮肤，避免注入器冲突。
- 不修改 Codex `.app`、`app.asar`、`WindowsApps` 或官方签名；本机 CDP 仅绑定 `127.0.0.1`。

## Beta 验证边界

发布前自动检查覆盖脚本语法、主题 payload、图片哈希与大小、回环与进程身份安全断言、安装包 CRC、SHA-256 和恢复路径。

这仍是免费公开 Beta：

- macOS 最终客户 ZIP 的真实 Codex 安装 → 界面验证 → 恢复闭环仍需补齐。
- Windows 10 / 11 真机上的 Store Codex、PowerShell、快捷方式、真实 DOM 与恢复闭环仍需补齐。
- 尚未完成 macOS Developer ID / 公证和 Windows Authenticode 签名，系统可能显示安全提醒。请先核对 SHA-256，不要关闭 Gatekeeper 或 SmartScreen。

本项目非 OpenAI 官方产品，与 OpenAI、成都相关机构或熊猫保护机构没有隶属、赞助或背书关系。
