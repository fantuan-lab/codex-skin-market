# Codex Skin Lab · 双平台皮肤源码

这里是 Codex Skin Lab 的皮肤引擎、主题源码、发布说明和校验脚本。所有皮肤都基于
[`Fei-Away/Codex-Dream-Skin`](https://github.com/Fei-Away/Codex-Dream-Skin)
commit `568469a4` 的完整源码制作，保留 renderer、CSS、CDP 监看、验证和恢复链路。

## 皮肤目录

| 皮肤 | macOS | Windows | 状态 |
| --- | --- | --- | --- |
| 竹影熊猫 | `bamboo-panda/macos/` | `bamboo-panda/windows/` | 免费公开 Beta 1 |
| 月影灵编 | `moon-spirit/macos/` | `moon-spirit/windows/` | 免费公开 Beta 1 |

普通用户不需要克隆源码：请去项目根目录 README 或 GitHub Releases 下载与系统对应的 ZIP。

## 安装模型

- 同一时间只有一款活动皮肤。安装另一款会先备份当前主题，再切换到新主题，避免两套注入器争抢同一个 Codex 界面。
- 恢复工具会停止本地注入，恢复安装前的 Codex 外观设置，并清理本项目生成的界面元素。
- 不修改 Codex `.app`、`app.asar`、`WindowsApps` 或官方签名；CDP 只绑定到 `127.0.0.1`。

## Beta 验证边界

源码库自动检查包括：脚本语法、主题 payload、图片哈希与大小、本机回环与进程身份断言、ZIP CRC、SHA-256 和恢复路径。

目前仍需社区补齐 macOS 最终客户 ZIP 和 Windows 10/11 真机的完整安装 → 界面验证 → 恢复闭环。两端也尚未进行代码签名，所以系统可能显示安全提醒；不要关闭 Gatekeeper 或 SmartScreen。

## 源码结构

```text
vendor/Codex-Dream-Skin/  上游 commit 的本地锁定快照（不提交到 Git）
bamboo-panda/macos/       竹影熊猫 macOS 源码
bamboo-panda/windows/     竹影熊猫 Windows 源码
moon-spirit/macos/        月影灵编 macOS 源码
moon-spirit/windows/      月影灵编 Windows 源码
releases/                 发布说明与 SHA-256 清单
UPSTREAM.md               上游版本与许可记录
verify-release.sh         双皮肤、双平台发布验证
```

软件代码保留上游 MIT License。主题图片按各包内 `ARTWORK-LICENSE.md` 单独处理。项目与 OpenAI 无隶属、赞助或背书关系。
