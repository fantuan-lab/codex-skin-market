# 月影灵编 · 双平台 Codex 皮肤

这不是商城效果图，也不是另写的简化注入器。`moon-spirit/` 直接以
[`Fei-Away/Codex-Dream-Skin`](https://github.com/Fei-Away/Codex-Dream-Skin)
commit `568469a4` 的完整源码为底座，保留真实 renderer、CSS、CDP watch、验证和恢复链路，再换成原创「月影灵编」主题。

## 内测安装包

- `releases/codex-moon-spirit-macos-beta1.zip`
- `releases/codex-moon-spirit-windows-beta1.zip`
- `releases/SHA256SUMS.txt`

这两个包目前都应视为 **免费公开 Beta**，还不是可直接收费上架的签名正式版。

### macOS

解压后，在 Finder 中双击 `安装月影灵编.command`。若 macOS 阻止打开，右键（或按住 Control 点击）该文件，选择“打开”；不要关闭 Gatekeeper。

已完成：上游测试、payload 检查、官方 Codex 签名与内置 Node 检查、隔离 HOME 安装、客户 ZIP 解压后复测、恢复代码检查。

尚未完成：最终 ZIP 在真实 Codex 首页/任务页上的 install → live verify → screenshot → restore 闭环。这个动作会重启当前正在工作的 Codex，所以本次构建没有冒充“已真机通过”。

### Windows

解压后先双击 `Install Moon Spirit.cmd`，之后只使用安装器创建的桌面“Codex 月影灵编”启动、验证和恢复入口。

已完成：Node 语法、主题 payload、资源哈希、回环/Store 进程/安全 PID 静态断言、ZIP CRC 与解压复测。

尚未完成：Windows 10/11 真机上的 PowerShell、Microsoft Store Codex 路径、快捷方式、真实 DOM 和恢复闭环。正式收费前还需要 Windows 11 x64 实测与代码签名。

## 源码结构

```text
vendor/Codex-Dream-Skin/  上游 commit 的原始快照
moon-spirit/macos/        月影灵编 macOS 衍生版
moon-spirit/windows/      月影灵编 Windows 衍生版
releases/                 双平台内测 ZIP 与 SHA-256
UPSTREAM.md               上游版本和许可记录
```

软件代码保留上游 MIT License；原创主题图片按各包内 `ARTWORK-LICENSE.md` 的 Beta 条款处理。项目与 OpenAI 无隶属、赞助或背书关系。
