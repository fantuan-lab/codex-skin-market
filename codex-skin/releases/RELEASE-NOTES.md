# 月影灵编 Beta 1 · 2026-07-16

基于 `Fei-Away/Codex-Dream-Skin` commit `568469a4` 的双平台内测版。

## 文件

| 平台 | 安装包 | SHA-256 |
| --- | --- | --- |
| macOS | `codex-moon-spirit-macos-beta1.zip` | `8a41d06534a39b6bac7c6c3454d50eb14ef3551a377c18c60fb6c0a9a7e0e039` |
| Windows | `codex-moon-spirit-windows-beta1.zip` | `03f21e6ab22b923a5958686f192f5f21bdb53b4486d69611c38dd3c3df2c4c0c` |

## 已验证

- macOS：上游测试、主题 payload、官方 Codex 签名与内置 Node、隔离安装、解压后 runtime 测试、ZIP CRC。
- Windows：Node 语法与主题 payload、资源哈希、Store/loopback/PID 静态安全断言、PS1 UTF-8 BOM、ZIP CRC。
- 两端：旧人物/赞助文案扫描、MIT 与来源声明、独立素材 Beta 许可、SHA-256。

## 尚未验证

- 最终 ZIP 在真实 macOS Codex 中的完整安装 → live verify → 首页/任务页截图 → restore 闭环。
- Windows 10/11 真机 PowerShell、Microsoft Store Codex、快捷方式、真实 DOM 与恢复闭环。
- 面向收费客户的 macOS Developer ID/公证和 Windows Authenticode 签名。

因此这是免费公开 Beta，不应在完成上述真机和签名验收前对外宣称“正式商用版”。
