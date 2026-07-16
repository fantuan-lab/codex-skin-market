# Codex Skin Lab · 月影灵编

![Beta](https://img.shields.io/badge/status-public_beta-2457F5)
![macOS](https://img.shields.io/badge/macOS-beta-111111?logo=apple)
![Windows](https://img.shields.io/badge/Windows-beta-2457F5?logo=windows11)
![License](https://img.shields.io/badge/derived_code-MIT-CCFF3D)

![月影灵编 Codex Desktop 皮肤](./public/skins/moon-spirit-hero.png)

给 Codex 桌面端，换一张会呼吸的脸。

「月影灵编」是一个非官方 Codex Desktop 互动皮肤，直接基于
[`Fei-Away/Codex-Dream-Skin`](https://github.com/Fei-Away/Codex-Dream-Skin)
的 MIT 源码制作。它不是一张壁纸截图：主题运行时，Codex 原生侧栏、任务、建议卡和输入框仍保持可交互。

> 当前为免费公开 Beta，不是已经完成签名与双平台真机验收的正式商用版。本项目与 OpenAI 没有隶属、赞助或背书关系。

## 下载 Beta 1

| 平台 | 安装包 | 当前验证状态 |
| --- | --- | --- |
| macOS | [codex-moon-spirit-macos-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/v0.1.0-beta.1/codex-moon-spirit-macos-beta1.zip) | 上游测试、隔离安装、客户 ZIP 解压复测与恢复代码检查已通过；最终真实 UI 闭环待验收 |
| Windows 10 / 11 | [codex-moon-spirit-windows-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/v0.1.0-beta.1/codex-moon-spirit-windows-beta1.zip) | 脚本语法、安全断言、资源哈希与 ZIP 复测已通过；Windows 11 真机闭环待验收 |

下载后请核对 Release 中的 `SHA256SUMS.txt`。

## 安装

### macOS

1. 解压安装包。
2. 在 Finder 中双击 `安装月影灵编.command`。
3. 如果 macOS 阻止打开，请右键或按住 Control 点击文件，再选择“打开”；不要关闭 Gatekeeper。
4. 需要退出主题时，运行包内恢复工具。

### Windows

1. 解压安装包。
2. 双击 `Install Moon Spirit.cmd`。
3. 后续只使用安装器创建的桌面“Codex 月影灵编”启动、验证与恢复入口。
4. 遇到 SmartScreen 提示时，请先核对 SHA-256；当前 Beta 尚未做 Authenticode 签名。

更完整的平台说明见 [`codex-skin/README.md`](./codex-skin/README.md)。Bug 反馈请使用
[结构化 Issue 表单](https://github.com/fantuan-lab/codex-skin-market/issues/new?template=bug-report.yml)，不要上传 API Key、Token、Cookie、密码、私人代码或未脱敏日志。

## 安全模型

主题通过官方 Codex 进程开放的本机 CDP 调试端口注入 CSS 与装饰 DOM：

- CDP 明确绑定在 `127.0.0.1`；
- 不修改 `.app`、`app.asar`、`WindowsApps` 或官方签名；
- 不替换 Codex 原生侧栏、项目选择器、建议卡和输入框；
- 设计上不采集或上传账号、代码、对话及模型配置；
- 包含验证、停止与一键恢复流程；
- 源码、上游 commit、许可证和发布校验值公开。

第三方本机调试工具不等于零风险。安装前请阅读脚本，Beta 阶段不要在无法接受中断的关键环境中使用。

## 中转站 / Relay Provider 合作

我们开放透明的联名与资源合作：服务商可以提供稳定额度、设备或兼容性测试支持；项目可以提供主题入口、安装教程、联名主题与公开展示位。

所有合作必须披露关系，不把赞助包装成独立评测，也不会通过 Issue 索取任何用户凭据。

[提交公开合作申请 →](https://github.com/fantuan-lab/codex-skin-market/issues/new?template=relay-partnership.yml)

## 仓库结构

```text
app/                              网站与下载落地页
public/skins/                     主题预览素材
codex-skin/moon-spirit/macos/     macOS 皮肤源码、安装、验证与恢复
codex-skin/moon-spirit/windows/   Windows 皮肤源码、安装、验证与恢复
codex-skin/releases/              发布说明与校验值
codex-skin/UPSTREAM.md            上游 URL、锁定 commit 与许可记录
.github/ISSUE_TEMPLATE/           Bug 与中转站合作表单
```

锁定的上游快照 `codex-skin/vendor/` 仅用于本地审计，不重复提交到本仓库。完整来源见 [`codex-skin/UPSTREAM.md`](./codex-skin/UPSTREAM.md)。

## 本地开发

```bash
npm install
npm run dev
npm test
./codex-skin/verify-release.sh
```

Node.js 版本要求见 `package.json`。

## 许可与商标

衍生软件代码保留上游 MIT License 与 `NOTICE.md`。原创主题图片按各平台包内 `ARTWORK-LICENSE.md` 的 Beta 条款处理，不自动转为 MIT。OpenAI、Codex 及其标识属于各自权利人；本项目未获得 OpenAI 官方授权或背书。
