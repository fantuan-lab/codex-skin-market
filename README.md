# Codex Skin Lab · 非官方 Codex 皮肤库

![Public Beta](https://img.shields.io/badge/status-public_beta-4F6D34)
![Skins](https://img.shields.io/badge/skins-2-DBE58E)
![macOS](https://img.shields.io/badge/macOS-beta-111111?logo=apple)
![Windows](https://img.shields.io/badge/Windows-beta-4F6D34?logo=windows11)
![License](https://img.shields.io/badge/derived_code-MIT-DBE58E)

给 Codex 桌面端换一种工作氛围。当前公开「竹影熊猫」与「月影灵编」两款免费 Beta，均提供 macOS、Windows 安装包、验证与恢复路径。

> **普通用户请不要点击 `Code → Download ZIP`，也不要下载 Release 页面底部由 GitHub 自动生成的 `Source code (zip / tar.gz)`。** 这些是源码，不是安装包。请直接选择下面与你系统对应的 ZIP。

## 直接下载

### 竹影熊猫 Beta 1 · NEW

![竹影熊猫 Codex Desktop 皮肤视觉概念图](./public/skins/bamboo-panda-hero.png)

熊猫、竹影与成都松弛感进入 Codex 工作台。上图为**视觉概念图**，实际效果会随 Codex 版本、系统字体和窗口尺寸略有差异。

| 平台 | 直接下载安装包 | 发布说明 |
| --- | --- | --- |
| macOS | [codex-bamboo-panda-macos-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/bamboo-panda-v0.1.0-beta.1/codex-bamboo-panda-macos-beta1.zip) | [Bamboo Panda Beta 1](https://github.com/fantuan-lab/codex-skin-market/releases/tag/bamboo-panda-v0.1.0-beta.1) |
| Windows 10 / 11 | [codex-bamboo-panda-windows-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/bamboo-panda-v0.1.0-beta.1/codex-bamboo-panda-windows-beta1.zip) | [Bamboo Panda Beta 1](https://github.com/fantuan-lab/codex-skin-market/releases/tag/bamboo-panda-v0.1.0-beta.1) |

### 月影灵编 Beta 1

![月影灵编 Codex Desktop 皮肤](./public/skins/moon-spirit-hero.png)

| 平台 | 直接下载安装包 | 当前验证状态 |
| --- | --- | --- |
| macOS | [codex-moon-spirit-macos-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/v0.1.0-beta.1/codex-moon-spirit-macos-beta1.zip) | 上游测试、隔离安装、客户 ZIP 解压复测与恢复代码检查已通过；最终真实 UI 闭环待验收 |
| Windows 10 / 11 | [codex-moon-spirit-windows-beta1.zip](https://github.com/fantuan-lab/codex-skin-market/releases/download/v0.1.0-beta.1/codex-moon-spirit-windows-beta1.zip) | 脚本语法、安全断言、资源哈希与 ZIP 复测已通过；Windows 10 / 11 真机闭环待验收 |

月影灵编的完整发布说明与 SHA-256 见 [Moon Spirit Beta 1](https://github.com/fantuan-lab/codex-skin-market/releases/tag/v0.1.0-beta.1)。竹影熊猫的校验值与最新验证边界以对应 Release 为准。

## 用户拿到后怎么用

### macOS

1. 下载皮肤名称中带 `macos` 的 ZIP。
2. 完整解压，不要在压缩包预览中运行文件。
3. 打开解压后的最外层文件夹，双击顶层“安装 / Install”入口。
4. 如果 macOS 阻止打开，请右键或按住 Control 点击安装入口，再选择“打开”；不要关闭 Gatekeeper。
5. 遇到问题先运行包内验证工具；需要退出主题时运行同包提供的恢复入口。

### Windows 10 / 11

1. 下载皮肤名称中带 `windows` 的 ZIP。
2. 右键“全部解压”，再打开解压后的最外层文件夹。
3. 双击顶层 `Install … .cmd` 安装入口。
4. 后续使用安装器创建的对应皮肤启动、验证和恢复入口。
5. 如遇 SmartScreen，请先核对 Release 中的 SHA-256；当前 Beta 尚未进行 Authenticode 签名，不要关闭 SmartScreen。

Bug 反馈请使用[结构化 Issue 表单](https://github.com/fantuan-lab/codex-skin-market/issues/new?template=bug-report.yml)。不要上传 API Key、Token、Cookie、密码、私人代码或未脱敏日志。

## 当前 Beta 边界

- 两款皮肤均为**免费公开 Beta**，不是已完成双平台签名和全部真机验收的正式商用版。
- macOS 尚未完成面向正式发行的 Developer ID 签名与公证；Windows 尚未完成 Authenticode 签名。
- 每款皮肤的自动化测试、真机测试和恢复闭环状态分别记录在对应 Release；一款皮肤的测试结果不自动代表另一款。
- 竹影熊猫主视觉当前标注为设计目标概念图，不冒充已验收的真实运行截图。
- 项目与 OpenAI、成都相关机构或熊猫保护机构没有隶属、赞助或背书关系。

## 安全模型

主题通过官方 Codex 进程开放的本机 CDP 调试端口注入 CSS 与装饰 DOM：

- CDP 明确绑定在 `127.0.0.1`；
- 不修改 `.app`、`app.asar`、`WindowsApps` 或官方签名；
- 不替换 Codex 原生侧栏、项目选择器、建议卡和输入框；
- 设计上不采集或上传账号、代码、对话及模型配置；
- 包含验证、停止与恢复流程；
- 源码、上游 commit、许可证和发布校验值公开。

第三方本机调试工具不等于零风险。安装前请阅读脚本；Beta 阶段不要在无法接受中断的关键环境中使用。

## 中转站 / Relay Provider 合作

我们开放透明的联名与资源合作：服务商可以提供稳定额度、设备或兼容性测试支持；项目可以提供主题入口、安装教程、联名主题与公开展示位。

所有合作必须披露关系，不把赞助包装成独立评测，也不会通过 Issue 索取任何用户凭据。

[提交公开合作申请 →](https://github.com/fantuan-lab/codex-skin-market/issues/new?template=relay-partnership.yml)

## 仓库结构

```text
app/                                  网站与双皮肤下载落地页
public/skins/                         主题预览素材
codex-skin/bamboo-panda/macos/        竹影熊猫 macOS 源码、安装、验证与恢复
codex-skin/bamboo-panda/windows/      竹影熊猫 Windows 源码、安装、验证与恢复
codex-skin/moon-spirit/macos/         月影灵编 macOS 源码、安装、验证与恢复
codex-skin/moon-spirit/windows/       月影灵编 Windows 源码、安装、验证与恢复
codex-skin/releases/                  发布说明与校验值
codex-skin/UPSTREAM.md                上游 URL、锁定 commit 与许可记录
.github/ISSUE_TEMPLATE/               Bug 与中转站合作表单
```

锁定的上游快照 `codex-skin/vendor/` 仅用于本地审计，不重复提交到本仓库。完整来源见 [`codex-skin/UPSTREAM.md`](./codex-skin/UPSTREAM.md)。

## 本地开发

```bash
npm install
npm run dev
npm run lint
npm run build
```

Node.js 版本要求见 `package.json`。

## 许可与商标

衍生软件代码保留上游 MIT License 与 `NOTICE.md`。原创主题图片按各平台包内 `ARTWORK-LICENSE.md` 的条款处理，不自动转为 MIT。OpenAI、Codex 及其标识属于各自权利人；本项目未获得 OpenAI 官方授权或背书。
